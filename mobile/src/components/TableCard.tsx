import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { Table } from '../types/restaurant';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TableCardProps {
  table: Table;
  onPress: (table: Table) => void;
  onLongPress?: (table: Table) => void;
}

export default function TableCard({ table, onPress, onLongPress }: TableCardProps) {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VACANT': return '#22c55e'; // green
      case 'OCCUPIED': return '#ef4444'; // red
      case 'PARTIALLY_OCCUPIED': return '#f59e0b'; // amber
      case 'RESERVED': return '#3b82f6'; // blue
      case 'MAINTENANCE': return '#64748b'; // slate
      default: return '#94a3b8';
    }
  };

  const statusColor = getStatusColor(table.status);
  const isOccupied = table.status === 'OCCUPIED' || table.status === 'PARTIALLY_OCCUPIED';

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(table)}
      onLongPress={() => onLongPress?.(table)}
      activeOpacity={0.7}
    >
      <Surface 
        style={[
          styles.surface, 
          { borderTopColor: statusColor, borderTopWidth: 4 }
        ]} 
        elevation={isOccupied ? 4 : 1}
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.number}>T-{table.number}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.capacityRow}>
            <MaterialCommunityIcons name="account-group" size={12} color="#64748b" />
            <Text variant="bodySmall" style={styles.capacity}>{table.capacity}</Text>
          </View>
          {table.status !== 'VACANT' && (
            <Text variant="labelSmall" style={styles.statusText}>{table.status.replace('_', ' ')}</Text>
          )}
        </View>

        {table.active_order && (
          <View style={[styles.orderBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
            <MaterialCommunityIcons name="receipt" size={10} color={statusColor} />
            <Text variant="labelSmall" style={[styles.orderText, { color: statusColor }]}>#{table.active_order.id}</Text>
          </View>
        )}
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 6,
    minWidth: '33%',
  },
  surface: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'white',
    height: 100,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  number: {
    fontWeight: '900',
    fontSize: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    marginTop: 2,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacity: {
    color: '#64748b',
    fontWeight: '600',
  },
  statusText: {
    fontWeight: '800',
    marginTop: 2,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  orderBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  orderText: {
    fontSize: 9,
    fontWeight: '900',
  }
});
