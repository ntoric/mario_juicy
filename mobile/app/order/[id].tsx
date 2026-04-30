import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Appbar, Searchbar, useTheme, Chip, Button, Badge, Surface, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { restaurantService } from '../../src/services/restaurantService';
import { MenuItem, Category, Order } from '../../src/types/restaurant';
import MenuItemCard from '../../src/components/MenuItemCard';

interface CartItem {
  item: MenuItem;
  quantity: number;
}

export default function OrderScreen() {
  const { id, tableId, tableNumber } = useLocalSearchParams<{ id: string, tableId: string, tableNumber: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [categoriesData, itemsData] = await Promise.all([
        restaurantService.getCategories(),
        restaurantService.getItems()
      ]);
      setCategories(categoriesData);
      setItems(itemsData);
      setFilteredItems(itemsData);

      if (id !== 'new') {
        const orderData = await restaurantService.getOrder(parseInt(id));
        setActiveOrder(orderData);
      }
    } catch (error) {
      console.error('Failed to fetch order data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = items;
    if (selectedCategory) {
      result = result.filter(i => i.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredItems(result);
  }, [selectedCategory, searchQuery, items]);

  const addToCart = (item: MenuItem) => {
    if (activeOrder && (activeOrder.status === 'COMPLETED' || activeOrder.status === 'PAID' || activeOrder.status === 'CANCELLED')) {
      Alert.alert('Order Finalized', 'This order is already completed or settled.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    if (activeOrder && (activeOrder.status === 'COMPLETED' || activeOrder.status === 'PAID' || activeOrder.status === 'CANCELLED')) {
      Alert.alert('Order Finalized', 'This order is already completed or settled.');
      return;
    }

    setSubmitting(true);
    try {
      let orderId = activeOrder?.id;

      // 1. Create order if new
      if (id === 'new') {
        const newOrder = await restaurantService.createOrder({
          table: parseInt(tableId),
          order_type: 'DINE_IN',
          number_of_persons: 1 // Default
        });
        orderId = newOrder.id;
      }

      // 2. Add items to order
      if (orderId) {
        await Promise.all(cart.map(cartItem => 
          restaurantService.addItemToOrder(orderId!, {
            item: cartItem.item.id,
            quantity: cartItem.quantity
          })
        ));

        // 3. Send to kitchen
        await restaurantService.sendToKitchen(orderId);
        
        Alert.alert('Success', 'Order sent to kitchen!');
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process order');
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cart.reduce((acc, curr) => acc + (parseFloat(curr.item.price) * curr.quantity), 0);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Table ${tableNumber}`} subtitle={activeOrder ? `Order #${activeOrder.id}` : 'New Order'} />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search menu..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          elevation={0}
        />
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          <Chip 
            selected={selectedCategory === null} 
            onPress={() => setSelectedCategory(null)}
            style={styles.categoryChip}
          >
            All
          </Chip>
          {categories.map(cat => (
            <Chip 
              key={cat.id}
              selected={selectedCategory === cat.id} 
              onPress={() => setSelectedCategory(cat.id)}
              style={styles.categoryChip}
            >
              {cat.name}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={({ item }) => <MenuItemCard item={item} onAdd={addToCart} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.itemList}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {cart.length > 0 && (
        <Surface style={styles.cartBar} elevation={4}>
          <View style={styles.cartInfo}>
            <View style={styles.cartCount}>
              <Badge size={24}>{totalItems}</Badge>
              <Text variant="titleMedium" style={styles.cartLabel}> Items</Text>
            </View>
            <Text variant="titleLarge" style={styles.totalPrice}>₹{totalPrice.toFixed(2)}</Text>
          </View>
          <Button 
            mode="contained" 
            onPress={handleSendToKitchen}
            loading={submitting}
            disabled={submitting}
            style={styles.orderButton}
          >
            SEND TO KITCHEN
          </Button>
        </Surface>
      )}
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
  },
  searchContainer: {
    padding: 12,
    backgroundColor: 'white',
  },
  searchBar: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  categoryContainer: {
    backgroundColor: 'white',
    paddingBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryChip: {
    marginRight: 4,
  },
  itemList: {
    paddingVertical: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flex: 1,
  },
  cartCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartLabel: {
    marginLeft: 8,
    color: '#64748b',
  },
  totalPrice: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  orderButton: {
    backgroundColor: '#E9762B',
    borderRadius: 8,
    paddingHorizontal: 16,
  }
});
