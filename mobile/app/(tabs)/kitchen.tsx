import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, Chip, IconButton, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { restaurantService } from '../../src/services/restaurantService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function KitchenScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchKitchenItems = useCallback(async () => {
    try {
      const data = await restaurantService.getKitchenItems();
      setItems(data);
    } catch (error: any) {
      console.error('Failed to fetch kitchen items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenItems();
    // Refresh every 30 seconds
    const interval = setInterval(fetchKitchenItems, 30000);
    return () => clearInterval(interval);
  }, [fetchKitchenItems]);

  const handleAction = async (itemId: number, action: 'attend' | 'ready') => {
    try {
      if (action === 'attend') {
        await restaurantService.attendItem(itemId);
      } else {
        await restaurantService.readyItem(itemId);
      }
      fetchKitchenItems();
    } catch (error: any) {
      Alert.alert('Action Failed', error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#FFC107';
      case 'ATTENDING': return '#2196F3';
      case 'READY': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.cardHeader}>
        <View>
          <Text variant="titleMedium" style={styles.itemName}>{item.item_details.name}</Text>
          <Text variant="bodySmall" style={styles.orderInfo}>
            Order #{item.order} • {item.order_type === 'DINE_IN' ? `Table ${item.table_number}` : 'Takeaway'}
          </Text>
        </View>
        <Chip 
          textStyle={{ fontSize: 10, fontWeight: '900' }} 
          style={{ backgroundColor: getStatusColor(item.status), height: 24 }}
        >
          {item.status}
        </Chip>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.qtyContainer}>
          <Text style={styles.qtyLabel}>QTY</Text>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
        </View>
        {item.notes ? (
          <View style={styles.notesContainer}>
            <MaterialCommunityIcons name="note-text-outline" size={14} color="#666" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>

      <Divider style={styles.divider} />

      <View style={styles.cardActions}>
        {item.status === 'PENDING' && (
          <Button 
            mode="contained" 
            onPress={() => handleAction(item.id, 'attend')}
            style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}
            labelStyle={styles.actionLabel}
          >
            START COOKING
          </Button>
        )}
        {(item.status === 'PENDING' || item.status === 'ATTENDING') && (
          <Button 
            mode="contained" 
            onPress={() => handleAction(item.id, 'ready')}
            style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
            labelStyle={styles.actionLabel}
          >
            MARK READY
          </Button>
        )}
      </View>
    </Surface>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>Kitchen Display</Text>
        <IconButton icon="refresh" onPress={() => { setRefreshing(true); fetchKitchenItems(); }} />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchKitchenItems(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chef-hat" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pending items in kitchen</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#333',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  itemName: {
    fontWeight: '900',
    color: '#1a1a1a',
  },
  orderInfo: {
    color: '#666',
    marginTop: 2,
    fontWeight: '600',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E9762B',
    marginRight: 6,
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 12,
    color: '#e65100',
    marginLeft: 6,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: '#eee',
  },
  cardActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});
