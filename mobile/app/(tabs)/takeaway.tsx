import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, View, RefreshControl, Alert } from 'react-native';
import { Text, Appbar, List, Chip, useTheme, ActivityIndicator, FAB, Surface, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { restaurantService } from '../../src/services/restaurantService';
import { Order } from '../../src/types/restaurant';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TakeawayScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await restaurantService.getOrders();
      // Filter for takeaway orders that are active (not settled/completed)
      setOrders(data.filter(o => o.order_type === 'TAKE_AWAY' && o.status !== 'PAID' && o.status !== 'COMPLETED'));
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return '#4CAF50';
      case 'PREPARING': return '#2196F3';
      case 'ORDER_TAKEN': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const handleOrderPress = (item: Order) => {
    router.push({
      pathname: '/order/[id]',
      params: { id: item.id.toString(), tableId: '', tableNumber: 'Takeaway' }
    });
  };

  const handleSettle = (item: Order) => {
    router.push(`/settle/${item.id}`);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.header}>
        <Appbar.Content title="Takeaway Hub" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="history" onPress={() => {}} />
      </Appbar.Header>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={({ item }) => (
            <Surface style={styles.card} elevation={1}>
              <List.Item
                title={`Order #${item.id}`}
                titleStyle={styles.orderTitle}
                description={`${item.items.length} items • ₹${parseFloat(item.total_amount).toFixed(2)}`}
                descriptionStyle={styles.orderDesc}
                left={props => (
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="shopping" size={24} color={theme.colors.primary} />
                  </View>
                )}
                right={() => (
                  <View style={styles.rightContainer}>
                    <Chip 
                      textStyle={{ color: 'white', fontSize: 9, fontWeight: '900' }} 
                      style={{ backgroundColor: getStatusColor(item.status), height: 22 }}
                    >
                      {item.status.replace('_', ' ')}
                    </Chip>
                    <IconButton 
                      icon="cash-register" 
                      size={20} 
                      onPress={() => handleSettle(item)}
                      style={styles.settleBtn}
                      iconColor="#4CAF50"
                    />
                  </View>
                )}
                onPress={() => handleOrderPress(item)}
              />
            </Surface>
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="shopping-outline" size={64} color="#ccc" />
              <Text variant="bodyLarge" style={styles.emptyText}>No active takeaway orders</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        label="New Parcel"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push({
          pathname: '/order/[id]',
          params: { id: 'new', tableId: '', tableNumber: 'Takeaway' }
        })}
        color="white"
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
    backgroundColor: 'white',
    height: 100,
    paddingTop: 40,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#E9762B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  orderTitle: {
    fontWeight: '900',
  },
  orderDesc: {
    fontWeight: '600',
    color: '#666',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settleBtn: {
    marginLeft: 8,
    backgroundColor: '#f1f8f1',
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 20,
    borderRadius: 16,
  },
});
