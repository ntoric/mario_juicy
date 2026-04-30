import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Button, IconButton, Divider, Portal, Modal, RadioButton, TextInput, useTheme, ActivityIndicator, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { restaurantService } from '../../src/services/restaurantService';
import { Order } from '../../src/types/restaurant';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SettleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [invoice, setInvoice] = useState<any>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await restaurantService.getOrder(Number(id));
      setOrder(data);
      if (data.invoice) setInvoice(data.invoice);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load order');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setActionLoading(true);
    try {
      const inv = await restaurantService.checkout(Number(id), {
        payment_method: paymentMethod,
        mark_as_paid: false
      });
      setInvoice(inv);
    } catch (error: any) {
      Alert.alert('Checkout Failed', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async () => {
    setActionLoading(true);
    try {
      await restaurantService.checkout(Number(id), {
        payment_method: paymentMethod,
        mark_as_paid: true,
        notes
      });
      Alert.alert('Success', 'Order settled successfully', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      Alert.alert('Settlement Failed', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Settlement Details...</Text>
      </View>
    );
  }

  if (!order) return null;

  const subtotal = parseFloat(order.total_amount);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.header} elevation={1}>
          <View style={styles.headerTop}>
            <IconButton icon="chevron-left" onPress={() => router.back()} />
            <Text variant="titleLarge" style={styles.headerTitle}>Settle Order #{id}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.infoBadge}>
              <MaterialCommunityIcons name="table-chair" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                {order.order_type === 'DINE_IN' ? `Table ${order.table_number}` : 'Takeaway'}
              </Text>
            </View>
            <View style={styles.infoBadge}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="labelLarge" style={styles.sectionTitle}>ORDER SUMMARY</Text>
          {order.items.map((item, index) => (
            <View key={item.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{item.item_details.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</Text>
              </View>
              {index < order.items.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text variant="labelLarge" style={styles.sectionTitle}>PAYMENT METHOD</Text>
          <RadioButton.Group onValueChange={value => setPaymentMethod(value)} value={paymentMethod}>
            <View style={styles.radioRow}>
              <View style={styles.radioItem}>
                <RadioButton value="UPI" />
                <Text>UPI</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="CASH" />
                <Text>Cash</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="CARD" />
                <Text>Card</Text>
              </View>
            </View>
          </RadioButton.Group>
        </Surface>

        <Surface style={styles.summaryCard} elevation={2}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>

          {invoice?.tax_details && Object.entries(invoice.tax_details).map(([key, val]: [string, any]) => (
            <View key={key} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{key}</Text>
              <Text style={styles.summaryValue}>₹{parseFloat(val).toFixed(2)}</Text>
            </View>
          ))}

          <Divider style={styles.totalDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>
              ₹{invoice ? parseFloat(invoice.total_amount).toFixed(2) : subtotal.toFixed(2)}
            </Text>
          </View>

          {invoice && (
            <TextInput
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.notesInput}
              dense
            />
          )}

          <Button 
            mode="contained" 
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
            onPress={invoice ? handleSettle : handleCheckout}
            loading={actionLoading}
            disabled={actionLoading}
          >
            {invoice ? 'COMPLETE SETTLEMENT' : 'PROCEED TO CHECKOUT'}
          </Button>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'white',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '900',
    marginLeft: -8,
  },
  headerInfo: {
    flexDirection: 'row',
    paddingLeft: 12,
    marginTop: 4,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    color: '#444',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  sectionTitle: {
    fontWeight: '900',
    color: '#E9762B',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    fontWeight: '700',
    fontSize: 15,
  },
  itemQty: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontWeight: '800',
    fontSize: 15,
  },
  divider: {
    marginVertical: 4,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'white',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#666',
    fontWeight: '600',
  },
  summaryValue: {
    fontWeight: '700',
  },
  totalDivider: {
    marginVertical: 12,
    height: 1.5,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '900',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E9762B',
  },
  notesInput: {
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#E9762B',
  },
  actionButtonContent: {
    height: 54,
  },
});
