import React from "react";
import { View, Text, FlatList } from "react-native";

const DataScreen = ({ route }) => {
  const { data } = route.params;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Raw Air Quality Data</Text>

      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 5 }}>
            <Text>Time: {item.dt_time}</Text>
            <Text>PM2.5: {item["pm2.5cnc"]}</Text>
            <Text>PM10: {item["pm10cnc"]}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default DataScreen;