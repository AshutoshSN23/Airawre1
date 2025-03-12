import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ImageBackground, StyleSheet } from "react-native";
import { Database } from '@sqlitecloud/drivers';
import backgroundImage from "../assets/image.png"; // Ensure the image exists

const db = new Database("sqlitecloud://cz30m2nhnk.g4.sqlite.cloud:8860/AirAware?apikey=7puz0Wc0wQZp2ZGgchwZPAWxqhaR4mjIpWg1y2IL8F0");

const LoginOrSignup = ({ navigation }) => {
    const [username, setusername] = useState("");
    const [password, setPassword] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState("");

    const handleAction = async () => {
        try {
            if (isLogin) {
                const user = await db.sql`SELECT * FROM users WHERE username = ${username};`;
                console.log("User Query Result:", user);

                if (!user.length) {  // ✅ SQLiteCloudRowset behaves like an array
                    setMessage("User does not exist!");
                    return;
                }

                const storedPassword = user[0]?.password;  // ✅ Access directly
                console.log("Stored Password:", storedPassword);
                console.log("Entered Password:", password);

                if (storedPassword === password) {
                    setMessage("Login successful.");
                    navigation.navigate("HomeScreen");
                } else {
                    setMessage("Invalid credentials!");
                }
            }
            else {
                // Check if username already exists
                const existing = await db.sql`SELECT * FROM users WHERE username = ${username};`;
                if (existing?.rows?.length > 0) {  // ✅ Check if rows exist
                    setMessage("Username already exists. Please login.");
                    return;
                }


                // Insert new user
                const insertResult = await db.sql`INSERT INTO users (username, password) VALUES (${username}, ${password});`;
                console.log("Signup result:", insertResult);

                if (insertResult?.[0]?.CHANGES === 1) {
                    setMessage("Signup successful.");
                    navigation.navigate("HomeScreen");
                } else {
                    setMessage("Signup failed, please try again.");
                }
            }
        } catch (error) {
            console.error("Error:", error);
            setMessage(`Error: ${error.message}`);
        }
    };



    return (
        <ImageBackground source={backgroundImage} style={styles.background}>
            <View style={styles.container}>
                <Text style={styles.title}>🌍 Air Quality Dashboard</Text>
                <View style={styles.card}>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity style={[styles.toggleButton, isLogin && styles.activeButton]} onPress={() => setIsLogin(true)}>
                            <Text style={styles.toggleText}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleButton, !isLogin && styles.activeButton]} onPress={() => setIsLogin(false)}>
                            <Text style={styles.toggleText}>Signup</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput style={styles.input} placeholder="username" value={username} onChangeText={setusername} autoCapitalize="none" keyboardType="username-address" />
                    <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
                    {message !== "" && <Text style={styles.message}>{message}</Text>}
                    <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
                        <Text style={styles.actionButtonText}>{isLogin ? "Login" : "Signup"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: { flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
    container: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" },
    title: { fontSize: 30, fontWeight: "bold", color: "#fff", marginBottom: 10 },
    card: {
        width: "90%",
        maxWidth: 450,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: 40,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        alignItems: "center",
        elevation: 10,
    },
    toggleContainer: { flexDirection: "row", marginBottom: 20 },
    toggleButton: { paddingVertical: 12, paddingHorizontal: 35, borderRadius: 5, marginHorizontal: 5, backgroundColor: "#ccc" },
    activeButton: { backgroundColor: "#007bff" },
    toggleText: { color: "#fff", fontSize: 16 },
    input: { width: "100%", padding: 14, marginBottom: 15, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, fontSize: 16 },
    message: { color: "red", fontSize: 16, marginBottom: 10, textAlign: "center" },
    actionButton: { backgroundColor: "#007bff", padding: 16, borderRadius: 8, alignItems: "center", width: "100%", marginTop: 10 },
    actionButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default LoginOrSignup;
