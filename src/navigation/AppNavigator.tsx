import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import RecorderScreen from '../screens/RecorderScreen';
import { Colors } from '../theme';

export type RootStackParamList = {
    Login: undefined;
    Recorder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user, profile, loading, error, isAuthenticated, login, logout } = useAuth();

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Login">
                        {() => (
                            <LoginScreen
                                onLogin={login}
                                loading={loading}
                                error={error}
                            />
                        )}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Recorder">
                        {() => (
                            <RecorderScreen
                                user={user!}
                                displayName={profile?.displayName || user?.displayName || user?.email || 'Staff'}
                                onLogout={logout}
                            />
                        )}
                    </Stack.Screen>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
