import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SearchableDropdownProps {
  items: any[];
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

  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const borderColor = isDark ? '#2C2C2E' : '#E5E5EA';
  const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

  const selectedItem = items.find(
    (item) => item.id.toString() === selectedValue
  );

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (itemId: string) => {
    onValueChange(itemId);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <>
      {/* Buton Dropdown */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: inputBg, borderColor }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>
          {selectedItem ? selectedItem.name : placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={textColor} />
      </TouchableOpacity>

      {/* Modal cu listă */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Selectează Analiză
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchSection}>
              <View
                style={[
                  styles.searchBar,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                ]}
              >
                <MaterialIcons name="search" size={20} color="#8E8E93" />
                <TextInput
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder="Caută analiză..."
                  placeholderTextColor="#8E8E93"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    { borderBottomColor: borderColor },
                    item.id.toString() === selectedValue && styles.selectedItem,
                  ]}
                  onPress={() => handleSelect(item.id.toString())}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: textColor }]}>
                      {item.name}
                    </Text>
                    {item.unit && (
                      <Text style={styles.itemUnit}>Unitate: {item.unit}</Text>
                    )}
                  </View>
                  {item.id.toString() === selectedValue && (
                    <MaterialIcons name="check" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={48} color="#C7C7CC" />
                  <Text style={[styles.emptyText, { color: textColor }]}>
                    Nicio analiză găsită
                  </Text>
                  <Text style={styles.emptyHint}>
                    Încearcă alt termen de căutare
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={true}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Button
  button: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    fontSize: 16,
    flex: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },

  // Search
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },

  // List
  list: {
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  itemRange: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
