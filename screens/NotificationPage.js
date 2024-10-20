import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // For icons
import * as SplashScreen from 'expo-splash-screen';
import Header from '../Components/Header';

const NotificationPage = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Recent');

  useEffect(() => {
    const hideSplashScreen = async () => {
      await SplashScreen.hideAsync();
    };
    hideSplashScreen();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header with reusable Header component */}
      <Header 
        title="Notification"
        showBackButton={true}
        showSettingsButton={false} // You can toggle this as needed
        onBackPress={handleBackPress} // Define back press action
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Recent' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => handleTabChange('Recent')}
        >
          <Text style={activeTab === 'Recent' ? styles.activeTabText : styles.inactiveTabText}>
            Recent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'All Notifications' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => handleTabChange('All Notifications')}
        >
          <Text style={activeTab === 'All Notifications' ? styles.activeTabText : styles.inactiveTabText}>
            All Notifications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.contentText}>
          {activeTab === 'Recent' ? 'Showing Recent Notifications' : 'Showing All Notifications'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    margin: 15,
    borderRadius: 25, // Rounded corners for tab container
    padding: 5, // Space around the tabs
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 25, // Rounded corners for individual tabs
  },
  activeTab: {
    backgroundColor: '#FFFFFF', // Active tab color
    borderWidth: 1,
    borderColor: '#257446', // Green border for active tab
  },
  inactiveTab: {
    backgroundColor: 'transparent', // No background for inactive tabs
  },
  activeTabText: {
    color: '#257446',
    fontWeight: '600', // Semi-bold
  },
  inactiveTabText: {
    color: '#000000',
    fontWeight: '400', // Regular
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentText: {
    fontSize: 18,
    color: '#000',
  },
});

export default NotificationPage;
