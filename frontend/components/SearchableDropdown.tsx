import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SearchableDropdownProps {
  items: Array<{ id: number; name: string; unit?: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchableDropdown({
  items,
  selectedValue,
  onValueChange,
  placeholder = 'Selectează',
}: SearchableDropdownProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = items.find(
    (item) => item.id.toString() === selectedValue
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
    setSearchQuery('');
  };

  const containerBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const borderColor = isDark ? '#2C2C2E' : '#E5E5EA';
  const searchBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const itemBg = isDark ? '#2C2C2E' : '#F8F9FA';

  return (
    <>
      {/* TRIGGER BUTTON */}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: containerBg, borderColor }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerText, { color: textColor }]}
          numberOfLines={1}
        >
          {selectedItem
            ? `${selectedItem.name}${
                selectedItem.unit ? ` (${selectedItem.unit})` : ''
              }`
            : placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={textColor} />
      </TouchableOpacity>

      {/* MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: containerBg }]}>
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Selectează Analiză
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* SEARCH BAR */}
            <View
              style={[styles.searchContainer, { backgroundColor: searchBg }]}
            >
              <MaterialIcons name="search" size={20} color="#8E8E93" />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Caută analiză..."
                placeholderTextColor="#8E8E93"
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="clear" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            {/* RESULTS COUNT */}
            <Text style={[styles.resultsCount, { color: '#8E8E93' }]}>
              {filteredItems.length}{' '}
              {filteredItems.length === 1 ? 'rezultat' : 'rezultate'}
            </Text>

            {/* LIST */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = item.id.toString() === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.item,
                      { backgroundColor: isSelected ? '#007AFF20' : itemBg },
                    ]}
                    onPress={() => handleSelect(item.id.toString())}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: isSelected ? '#007AFF' : textColor },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.unit && (
                        <Text style={styles.itemUnit}>{item.unit}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={48} color="#8E8E93" />
                  <Text style={[styles.emptyText, { color: textColor }]}>
                    Nicio analiză găsită
                  </Text>
                  <Text style={styles.emptyHint}>
                    Încearcă un alt termen de căutare
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 16,
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },

  resultsCount: {
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 4,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemUnit: {
    fontSize: 13,
    color: '#8E8E93',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
