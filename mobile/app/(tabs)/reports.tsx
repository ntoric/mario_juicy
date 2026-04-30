import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, useTheme, ActivityIndicator, IconButton, Divider } from 'react-native-paper';
import { reportService, ReportSummary } from '../../src/services/reportService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ReportsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [salesByPayment, setSalesByPayment] = useState<any[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const params = { start_date: today, end_date: today };
    
    try {
      const [summ, pay, cat] = await Promise.all([
        reportService.getSummary(params),
        reportService.getSalesByPayment(params),
        reportService.getSalesByCategory(params),
      ]);
      setSummary(summ);
      setSalesByPayment(pay);
      setSalesByCategory(cat);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const SummaryCard = ({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) => (
    <Surface style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]} elevation={1}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{label}</Text>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.cardValue}>{value}</Text>
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
        <View>
          <Text variant="headlineSmall" style={styles.headerTitle}>Daily Insights</Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>Today's performance so far</Text>
        </View>
        <IconButton icon="refresh" onPress={() => { setRefreshing(true); fetchData(); }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <SummaryCard 
              label="Revenue" 
              value={`₹${summary?.total_sales.toLocaleString() || '0'}`} 
              icon="trending-up" 
              color="#E9762B" 
            />
            <SummaryCard 
              label="Avg. Order" 
              value={`₹${summary?.avg_order_value.toFixed(0) || '0'}`} 
              icon="cart-outline" 
              color="#d35400" 
            />
          </View>
          <View style={styles.gridCol}>
            <SummaryCard 
              label="Orders" 
              value={summary?.total_orders.toString() || '0'} 
              icon="receipt" 
              color="#FFD41D" 
            />
            <SummaryCard 
              label="Tax" 
              value={`₹${summary?.total_tax.toLocaleString() || '0'}`} 
              icon="bank-outline" 
              color="#CF0F0F" 
            />
          </View>
        </View>

        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>REVENUE BY PAYMENT</Text>
          {salesByPayment.map((item, index) => (
            <View key={index}>
              <View style={styles.row}>
                <View style={styles.rowLead}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={styles.rowLabel}>{item.payment_method}</Text>
                </View>
                <Text style={styles.rowValue}>₹{parseFloat(item.total_amount).toLocaleString()}</Text>
              </View>
              {index < salesByPayment.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>TOP CATEGORIES</Text>
          {salesByCategory.map((item, index) => (
            <View key={index}>
              <View style={styles.row}>
                <View style={styles.rowLead}>
                  <View style={[styles.dot, { backgroundColor: '#FFD41D' }]} />
                  <Text style={styles.rowLabel}>{item.category_name}</Text>
                </View>
                <Text style={styles.rowValue}>₹{parseFloat(item.total_amount).toLocaleString()}</Text>
              </View>
              {index < salesByCategory.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </Surface>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTitle: {
    fontWeight: '900',
    color: '#E9762B',
  },
  headerSubtitle: {
    color: '#666',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  gridCol: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E9762B',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
