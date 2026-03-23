import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * Configurație toast (stil snackbar modern)
 */

export const toastConfig = {
  success: (props: any) => {
    return (
      <View style={[styles.snackbar, styles.successSnackbar]}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.contentArea}>
          <Text style={styles.title}>{props.text1}</Text>
          {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
        </View>
      </View>
    );
  },

  error: (props: any) => {
    return (
      <View style={[styles.snackbar, styles.errorSnackbar]}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="error" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.contentArea}>
          <Text style={styles.title}>{props.text1}</Text>
          {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
        </View>
      </View>
    );
  },

  info: (props: any) => {
    return (
      <View style={[styles.snackbar, styles.infoSnackbar]}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="info" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.contentArea}>
          <Text style={styles.title}>{props.text1}</Text>
          {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
        </View>
      </View>
    );
  },

  warning: (props: any) => {
    return (
      <View style={[styles.snackbar, styles.warningSnackbar]}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="warning" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.contentArea}>
          <Text style={styles.title}>{props.text1}</Text>
          {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
        </View>
      </View>
    );
  },
};

const styles = StyleSheet.create({
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.58,
    shadowRadius: 16,
    elevation: 24,
    marginTop: 16,
  },
  successSnackbar: {
    backgroundColor: '#10B981', // Emerald green
  },
  errorSnackbar: {
    backgroundColor: '#EF4444', // Vivid red
  },
  infoSnackbar: {
    backgroundColor: '#3B82F6', // Bright blue
  },
  warningSnackbar: {
    backgroundColor: '#F59E0B', // Amber orange
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentArea: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.95,
    lineHeight: 18,
  },
});
