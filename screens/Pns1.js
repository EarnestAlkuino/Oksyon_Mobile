import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../supabase'; // Import your Supabase client

const Pns1 = () => {
  const [data, setData] = useState([]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: prices, error } = await supabase
          .from('pns1_prices') // Adjust to correct table name
          .select('*');

        if (error) {
          console.error('Error fetching data:', error);
        } else {
          // Organize data by animal for easier mapping in the component
          const organizedData = prices.reduce((acc, item) => {
            const { livestock, weight_range, label, price } = item;  // Change price_value to price
            const existingLivestock = acc.find((a) => a.livestock === livestock);

            if (existingLivestock) {
              existingLivestock.prices.push({ label, value: price });  // Use price instead of price_value
            } else {
              acc.push({
                livestock,
                weightRange: weight_range,
                prices: [{ label, value: price }],  // Use price instead of price_value
              });
            }
            return acc;
          }, []);

          setData(organizedData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this effect runs only once when the component mounts

  return (
    <ScrollView style={styles.scrollContainer}>
      {data.map((item, livestockIndex) => (
        <View key={livestockIndex} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.livestockText}>{item.livestock}</Text>
            <Text style={styles.weightRangeText}>{item.weightRange}</Text>
          </View>
          <View style={styles.priceBox}>
            {item.prices.map((price, priceIndex) => (
              <View key={priceIndex} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{price.label}</Text>
                <Text style={styles.priceValue}>{price.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 10,
    backgroundColor: '#f8f8f8',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  livestockText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weightRangeText: {
    fontSize: 16,
    color: '#777',
  },
  priceBox: {
    marginTop: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  priceLabel: {
    fontSize: 14,
    color: '#555',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Pns1;
