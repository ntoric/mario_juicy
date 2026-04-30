import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return <MaterialCommunityIcons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tables',
          tabBarIcon: ({ color }) => <TabBarIcon name="table-chair" color={color} />,
        }}
      />
      <Tabs.Screen
        name="kitchen"
        options={{
          title: 'Kitchen',
          tabBarIcon: ({ color }) => <TabBarIcon name="chef-hat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="takeaway"
        options={{
          title: 'Takeaway',
          tabBarIcon: ({ color }) => <TabBarIcon name="shopping" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <TabBarIcon name="chart-bar" color={color} />,
        }}
      />
    </Tabs>
  );
}
