import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Header from '../Components/Header';
import { supabase } from '../supabase';

const NotificationPage = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Recent');
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const hideSplashScreen = async () => {
      await SplashScreen.hideAsync();
    };
    hideSplashScreen();
  
    fetchNotifications();
    fetchAnnouncements();
  
    // Real-time listener for notifications specific to the current user
    const notificationChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          const currentUserId = await getCurrentUserId(); // Function to fetch the logged-in user's ID
          if (payload.new.recipient_id === currentUserId) {
            // Notify only the intended user
            await sendPushNotification('New Notification', payload.new.message);
  
            // Update notifications in local state
            setNotifications((prevNotifications) => [
              payload.new,
              ...prevNotifications,
            ]);
  
            // Increment unread count
            if (!payload.new.is_read) {
              setUnreadCount((prevCount) => prevCount + 1);
            }
          }
        }
      )
      .subscribe();
  
    // Real-time listener for announcements
    const announcementChannel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        async (payload) => {
          await sendPushNotification('New Announcement', payload.new.text);
          setAnnouncements((prevAnnouncements) => [
            payload.new,
            ...prevAnnouncements,
          ]);
        }
      )
      .subscribe();
  
    // Cleanup listeners on unmount
    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(announcementChannel);
    };
  }, []);
  
  // Function to fetch the current user's ID
  const getCurrentUserId = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      throw new Error('User not logged in');
    }
    return sessionData.session.user.id;
  };
  
  // Fetch notifications for the current user
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      const { data: userNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });
  
      if (error) throw new Error('Failed to fetch notifications');
  
      setNotifications(userNotifications);
  
      // Update unread notifications count
      const unreadNotifications = userNotifications.filter((notif) => !notif.is_read);
      setUnreadCount(unreadNotifications.length);
    } catch (err) {
      setError(err.message || 'Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  

  // Fetch announcements
  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load announcements');
    } else {
      setAnnouncements(data);
    }
  };

  // Helper function to send a push notification
  const sendPushNotification = async (title, message) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  };

  // Handle tab change (Recent vs All Notifications)
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle notification press (mark as read, navigate to relevant page)
  const handleNotificationPress = async (item) => {
    if (item.notification_id && !item.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', item.notification_id); // Ensure correct column name
      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) =>
          notif.notification_id === item.notification_id ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount((prevCount) => prevCount - 1);
    }
  
    // Check the type of notification and navigate accordingly
    if (item.notification_type === 'NEW_FORUM_QUESTION' || item.notification_type === 'NEW_FORUM_ANSWER') {
      // Fetch the `owner_id` if the recipient is a seller
      let ownerId = item.user_id; // Default to user_id passed in the notification
  
      if (item.recipient_role === 'SELLER') {
        try {
          const { data: livestockData, error } = await supabase
            .from('livestock')
            .select('owner_id')
            .eq('livestock_id', item.livestock_id)
            .single();
  
          if (error) {
            console.error('Error fetching owner_id:', error.message);
          } else {
            ownerId = livestockData.owner_id; // Use the owner_id for the seller
          }
        } catch (fetchError) {
          console.error('Error fetching livestock data:', fetchError.message);
        }
      }
  
      // Navigate to the ForumPage with the correct userId
      navigation.navigate('ForumPage', {
        item: {
          livestock_id: item.livestock_id, // Pass the livestock ID
          category: item.category || 'Unknown', // Include additional info for display
          created_by: item.created_by, // Thread creator
        },
        userId: ownerId, // Use owner_id for the seller or item.user_id for others
      });
    } else if (item.notification_type === 'AUCTION_END') {
      if (item.recipient_role === 'BIDDER') {
        // Navigate to WinnerConfirmationPage if the user is the winning bidder
        navigation.navigate('WinnerConfirmationPage', { livestockId: item.livestock_id });
      } else if (item.recipient_role === 'SELLER') {
        // Navigate to SellerTransactionPage if the user is the seller
        navigation.navigate('SellerTransactionPage', { livestockId: item.livestock_id });
      }
    } else if (item.livestock_id) {
      // Default navigation to LivestockAuctionDetailPage
      navigation.navigate('LivestockAuctionDetailPage', { itemId: item.livestock_id });
    }
  };
  
  
  

  // Render notification item in list
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      style={styles.notificationItemContainer}
    >
      <View style={[styles.notificationItem, item.is_read ? {} : styles.unreadNotification]}>
        <Text style={styles.contentText}>{item.message}</Text>
        <Text style={styles.timestampText}>{new Date(item.created_at).toLocaleString()}</Text>
        {/* Optional: You can show an icon or marker for unread notifications */}
        {!item.is_read && <Text style={styles.unreadMarker}>•</Text>}
      </View>
    </TouchableOpacity>
  );

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
    fetchAnnouncements();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Notifications" showBackButton={false} showSettingsButton={false} onBackPress={() => navigation.goBack()} />
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Recent' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => handleTabChange('Recent')}
        >
          <Text style={activeTab === 'Recent' ? styles.activeTabText : styles.inactiveTabText}>
            Recent {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'All Notifications' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => handleTabChange('All Notifications')}
        >
          <Text style={activeTab === 'All Notifications' ? styles.activeTabText : styles.inactiveTabText}>All Notifications</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#257446" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.notification_id || item.id.toString()}
            renderItem={renderNotificationItem}
            ListEmptyComponent={<Text style={styles.noNotificationsText}>No notifications available</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#257446',
  },
  inactiveTab: {
    borderBottomWidth: 3,
    borderColor: 'transparent',
  },
  activeTabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#257446',
  },
  inactiveTabText: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  notificationItemContainer: {
    marginBottom: 15,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#E0F7FA', // Light blue background for unread notifications
  },
  contentText: {
    fontSize: 14,
    color: '#333333',
  },
  timestampText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 5,
  },
  unreadMarker: {
    fontSize: 16,
    color: '#257446',
    position: 'absolute',
    top: 15,
    right: 15,
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
  },
  noNotificationsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#9E9E9E',
  },
});

export default NotificationPage;

   