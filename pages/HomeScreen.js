import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import { sites } from "./data"; // Importing the sites list

// Updated findSiteByCity function to handle city matching better
const findSiteByCity = (cityName) => {
  if (!cityName) return null;
  const normalizedInput = cityName.toLowerCase().trim();
  
  // Common city name variations
  const cityVariations = {
    'bengaluru': ['bangalore', 'bengaluru'],
    'mumbai': ['mumbai', 'bombay'],
    'delhi': ['delhi', 'new delhi'],
    'hyderabad': ['hyderabad'],
    'kolkata': ['kolkata', 'calcutta']
  };

  // Find matching city variation
  const matchingCity = Object.keys(cityVariations).find(city => 
    cityVariations[city].includes(normalizedInput)
  );

  if (matchingCity) {
    // Get first available monitoring site for the city
    return sites.find(site => site.city?.toLowerCase() === matchingCity);
  }

  // Direct city name match as fallback
  return sites.find(site => site.city?.toLowerCase() === normalizedInput);
};

// 🛠 Helper function to format date as YYYY-MM-DDTHH:MM
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const HomeScreen = ({ navigation }) => {
  // 🛠 Get current date and time
  const currentDate = new Date();
  const pastDate = new Date(currentDate);
  pastDate.setDate(currentDate.getDate() - 7); // 7 days ago

  // 🛠 Use formatted dates as default values
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(formatDate(pastDate));
  const [endDate, setEndDate] = useState(formatDate(currentDate));

  const handleSubmit = () => {
    if (!city.trim()) {
      Alert.alert("Invalid Input", "Please enter a city name.");
      return;
    }

    const site = findSiteByCity(city);

    if (!site) {
      Alert.alert(
        "No Monitoring Site", 
        `No air quality monitoring site found in ${city}. Available cities: Delhi, Mumbai, Bengaluru, Hyderabad, Kolkata`
      );
      return;
    }

    Alert.alert(
      "Monitoring Site Found", 
      `Site: ${site.name}\nCity: ${site.city}\nID: ${site.id}`
    );

    navigation.navigate("GraphScreen", {
      siteId: site.id,
      startDate,
      endDate,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Air Quality Monitor</Text>
      <Text style={styles.subtitle}>Available Cities: Delhi, Mumbai, Bengaluru, Hyderabad, Kolkata</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>City:</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          style={styles.input}
          placeholder="Enter city name (e.g., Mumbai)"
        />

        <Text style={styles.label}>Start Date:</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          style={styles.input}
        />

        <Text style={styles.label}>End Date:</Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          style={styles.input}
        />

        <Button 
          title="Find Site & Fetch Data" 
          onPress={handleSubmit}
          color="#4CAF50"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666'
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    color: '#444'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    fontSize: 16
  }
});

export default HomeScreen;
