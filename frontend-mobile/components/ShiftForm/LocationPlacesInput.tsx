import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GlobalStyles } from "../../constants/style";
import Input from "./Input";
import {
  fetchPlacePredictions,
  type PlacePrediction,
} from "../../util/placesAutocomplete";

const DEBOUNCE_MS = 400;

type LocationPlacesInputProps = {
  value: string;
  onChangeValue: (next: string) => void;
  onSelectSuggestion?: (prediction: PlacePrediction) => void;
  placeholder?: string;
};

export default function LocationPlacesInput({
  value,
  onChangeValue,
  onSelectSuggestion,
  placeholder = "Search address or place…",
}: LocationPlacesInputProps) {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const handle = setTimeout(() => {
      const seq = ++requestSeq.current;
      setLoading(true);
      fetchPlacePredictions(q)
        .then((preds) => {
          if (requestSeq.current !== seq) return;
          setSuggestions(preds);
        })
        .catch(() => {
          if (requestSeq.current !== seq) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (requestSeq.current === seq) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [value, isOpen]);

  function pickSuggestion(p: PlacePrediction) {
    onChangeValue(p.description);
    requestSeq.current += 1;
    onSelectSuggestion?.(p);
    setSuggestions([]);
    setLoading(false);
    setIsOpen(false);
    Keyboard.dismiss();
  }

  return (
    <View style={styles.wrap}>
      <Input
        textInputConfig={{
          placeholder,
          value,
          onFocus: () => setIsOpen(true),
          onChangeText: (text) => {
            setIsOpen(true);
            onChangeValue(text);
          },
          autoCapitalize: "words",
          autoCorrect: false,
        }}
      />
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={GlobalStyles.colors.maroon600} />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : null}
      {isOpen && suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((p) => (
            <Pressable
              key={p.placeId}
              onPress={() => pickSuggestion(p)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text style={styles.rowText} numberOfLines={2}>
                {p.description}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontSize: 13,
    color: GlobalStyles.colors.foreground + "99",
  },
  list: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GlobalStyles.colors.border,
    backgroundColor: GlobalStyles.colors.background,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GlobalStyles.colors.border,
  },
  rowPressed: {
    backgroundColor: GlobalStyles.colors.maroon50,
  },
  rowText: {
    fontSize: 14,
    color: GlobalStyles.colors.foreground,
  },
});
