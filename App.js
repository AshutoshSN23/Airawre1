import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./pages/HomeScreen";
import GraphScreen from "./pages/GraphScreen";
import DataScreen from "./pages/DataScreen";
import LoginOrSignup from "./pages/LoginOrSignup"; // Import LoginOrSignup screen

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginOrSignup}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: "Home" }} />
        <Stack.Screen name="GraphScreen" component={GraphScreen} options={{ title: "Graph Data" }} />
        <Stack.Screen name="DataScreen" component={DataScreen} options={{ title: "Raw Data" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
