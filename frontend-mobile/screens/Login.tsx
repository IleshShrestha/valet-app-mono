import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GlobalStyles } from "../constants/style";
import { useAuth } from "../store/Authcontext";
import { ApiError } from "../util/apiClient";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitHandler = async () => {
    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
    } catch (error) {
      if (error instanceof TypeError) {
        setErrorMessage("Could not connect to the server. Please try again.");
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable onPress={submitHandler} style={styles.button} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8, color: GlobalStyles.colors.maroon800 },
  input: {
    borderWidth: 1,
    borderColor: GlobalStyles.colors.maroon200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 8,
    backgroundColor: GlobalStyles.colors.maroon600,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  errorText: { color: GlobalStyles.colors.destructive, marginTop: 4 },
});
