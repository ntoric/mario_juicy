import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton, useTheme } from 'react-native-paper';
import { MenuItem } from '../types/restaurant';

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const theme = useTheme();

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text variant="titleMedium" style={styles.name}>{item.name}</Text>
          <Text variant="bodySmall" numberOfLines={2} style={styles.description}>
            {item.description}
          </Text>
          <Text variant="titleSmall" style={styles.price}>₹{item.price}</Text>
        </View>
        
        <View style={styles.imageSection}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: '#f1f5f9' }]}>
              <IconButton icon="food" size={24} iconColor="#94a3b8" />
            </View>
          )}
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => onAdd(item)}
          >
            <Text style={styles.addButtonLabel}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontWeight: 'bold',
  },
  description: {
    color: '#64748b',
    marginVertical: 4,
  },
  price: {
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 'auto',
  },
  imageSection: {
    width: 100,
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
    elevation: 2,
  },
  addButtonLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
