import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, View, RefreshControl, useWindowDimensions, Alert } from 'react-native';
import { Text, Appbar, Searchbar, useTheme, ActivityIndicator, Portal, Modal, Button, Divider, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { restaurantService } from '../../src/services/restaurantService';
import { Table } from '../../src/types/restaurant';
import TableCard from '../../src/components/TableCard';
import { useAuth } from '../../src/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TablesScreen() {
  const [tables, setTables] = useState<Table[]>([]);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const numColumns = width > 768 ? 6 : 3;

  const fetchTables = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await restaurantService.getTables();
      setTables(data);
      setFilteredTables(data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    const filtered = tables.filter(table => 
      table.number.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTables(filtered);
  }, [searchQuery, tables]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables(false);
  };

  const handleTablePress = (table: Table) => {
    router.push({
      pathname: '/order/[id]',
      params: { 
        id: table.active_order?.id || 'new', 
        tableId: table.id, 
        tableNumber: table.number 
      }
    });
  };

  const handleLongPress = (table: Table) => {
    setSelectedTable(table);
    setModalVisible(true);
  };

  const handleReleaseTable = async () => {
    if (!selectedTable) return;
    try {
      await restaurantService.releaseTable(selectedTable.id);
      setModalVisible(false);
      fetchTables(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to release table');
    }
  };

  const handleSettleTable = () => {
    if (!selectedTable?.active_order) return;
    setModalVisible(false);
    router.push(`/settle/${selectedTable.active_order.id}`);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.header}>
        <Appbar.Content title="Table Layout" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="bell-outline" onPress={() => {}} />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search tables..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          elevation={0}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Layout...</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={filteredTables}
          renderItem={({ item }) => (
            <TableCard 
              table={item} 
              onPress={handleTablePress} 
              onLongPress={handleLongPress}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="table-off" size={48} color="#cbd5e1" />
              <Text variant="bodyLarge" style={styles.emptyText}>No tables found</Text>
            </View>
          }
        />
      )}

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedTable && (
            <View>
              <Text variant="headlineSmall" style={styles.modalTitle}>Table {selectedTable.number}</Text>
              <Text variant="bodyMedium" style={styles.modalSubtitle}>Manage this table</Text>
              
              <Divider style={styles.modalDivider} />
              
              <List.Item
                title="Manage Order"
                description="Add items or view current order"
                left={props => <List.Icon {...props} icon="pencil-outline" color={theme.colors.primary} />}
                onPress={() => {
                  setModalVisible(false);
                  handleTablePress(selectedTable);
                }}
              />
              
              {selectedTable.active_order && (
                <List.Item
                  title="Settle Bill"
                  description="Complete payment and checkout"
                  left={props => <List.Icon {...props} icon="cash-register" color="#22c55e" />}
                  onPress={handleSettleTable}
                />
              )}

              {selectedTable.status !== 'VACANT' && (
                <List.Item
                  title="Release Table"
                  description="Mark as vacant manually"
                  left={props => <List.Icon {...props} icon="table-remove" color="#ef4444" />}
                  onPress={handleReleaseTable}
                />
              )}

              <Button 
                mode="outlined" 
                onPress={() => setModalVisible(false)} 
                style={styles.closeBtn}
              >
                Close
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchBar: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    height: 48,
  },
  listContent: {
    padding: 10,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 24,
  },
  modalTitle: {
    fontWeight: '900',
    color: '#1e293b',
  },
  modalSubtitle: {
    color: '#64748b',
    marginBottom: 8,
  },
  modalDivider: {
    marginVertical: 12,
  },
  closeBtn: {
    marginTop: 16,
    borderRadius: 12,
  }
});
