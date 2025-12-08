// app/auth/request-access.tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
     Image,
     ImageBackground,
     KeyboardAvoidingView,
     Modal,
     Platform,
     ScrollView,
     StyleSheet,
     Text,
     TouchableOpacity,
     View,
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

type RootStackParamList = {
     Auth: undefined;
     ResetPassword: undefined;
     RequestAccess: undefined;
     Main: undefined;
     Modal: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'RequestAccess'>;

const MOCK_COUNTRIES = ['Serbia', 'Croatia', 'Bosnia & Herzegovina'];
const MOCK_BUILDINGS = ['Building A', 'Building B', 'Building C'];

const RequestAccessScreen = () => {
     const navigation = useNavigation<NavigationProps>();

     const [country, setCountry] = useState<string | null>('Serbia');
     const [building, setBuilding] = useState<string | null>(null);

     const [countryModalVisible, setCountryModalVisible] = useState(false);
     const [buildingModalVisible, setBuildingModalVisible] = useState(false);

     const handleBackToLogin = () => {
          navigation.goBack(); // assumes you came from Auth screen
     };

     const renderSelectModal = (
          visible: boolean,
          onClose: () => void,
          items: string[],
          onSelect: (value: string) => void,
          title: string,
     ) => (
          <Modal visible={visible} transparent animationType="fade">
               <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                         <Text style={styles.modalTitle}>{title}</Text>
                         <ScrollView style={{ maxHeight: 260 }}>
                              {items.map((item) => (
                                   <TouchableOpacity
                                        key={item}
                                        style={styles.modalItem}
                                        onPress={() => {
                                             onSelect(item);
                                             onClose();
                                        }}
                                   >
                                        <Text style={styles.modalItemText}>{item}</Text>
                                   </TouchableOpacity>
                              ))}
                         </ScrollView>
                         <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                              <Text style={styles.modalCloseText}>Close</Text>
                         </TouchableOpacity>
                    </View>
               </View>
          </Modal>
     );

     return (
          <ImageBackground
               source={require('@/assets/images/login-bg.png')}
               style={styles.background}
               resizeMode="cover"
               blurRadius={6}
          >
               <View style={styles.overlay}>
                    <KeyboardAvoidingView
                         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                         style={styles.keyboardContainer}
                    >
                         <View style={styles.card}>
                              {/* Logo + app name */}
                              <View style={styles.logoRow}>
                                   <Image
                                        source={require('../../assets/images/nestlink-logo.png')}
                                        style={styles.logo}
                                        resizeMode="contain"
                                   />
                                   <Text style={styles.appName}>
                                        <Text style={{ fontWeight: '600' }}>NestLink</Text>{' '}
                                        <Text style={{ color: PRIMARY_COLOR, fontWeight: '700' }}>APP</Text>
                                   </Text>
                              </View>

                              {/* Title + subtitle */}
                              <Text style={styles.title}>Access Request</Text>
                              <Text style={styles.subtitle}>
                                   Please search for your building location and provide your details to request access.
                              </Text>

                              {/* Country select */}
                              <View style={styles.fieldGroup}>
                                   <Text style={styles.fieldLabel}>Country *</Text>
                                   <TouchableOpacity
                                        style={styles.selectInput}
                                        onPress={() => setCountryModalVisible(true)}
                                        activeOpacity={0.8}
                                   >
                                        <Text style={styles.selectText}>
                                             {country ?? 'Select country'}
                                        </Text>
                                        <Text style={styles.selectChevron}>▾</Text>
                                   </TouchableOpacity>
                              </View>

                              {/* Building select */}
                              <View style={styles.fieldGroup}>
                                   <Text style={styles.fieldLabel}>Building *</Text>
                                   <TouchableOpacity
                                        style={styles.selectInput}
                                        onPress={() => setBuildingModalVisible(true)}
                                        activeOpacity={0.8}
                                   >
                                        <Text style={styles.selectText}>
                                             {building ?? 'Select building'}
                                        </Text>
                                        <Text style={styles.selectChevron}>▾</Text>
                                   </TouchableOpacity>
                              </View>

                              {/* Here later you can add more fields (name, email, message, etc.) */}

                              {/* Back to login */}
                              <TouchableOpacity
                                   onPress={handleBackToLogin}
                                   style={styles.backToLoginButton}
                                   activeOpacity={0.7}
                              >
                                   <Text style={styles.backToLoginText}>Back to login</Text>
                              </TouchableOpacity>
                         </View>
                    </KeyboardAvoidingView>
               </View>

               {/* Country modal */}
               {renderSelectModal(
                    countryModalVisible,
                    () => setCountryModalVisible(false),
                    MOCK_COUNTRIES,
                    setCountry,
                    'Select country',
               )}

               {/* Building modal */}
               {renderSelectModal(
                    buildingModalVisible,
                    () => setBuildingModalVisible(false),
                    MOCK_BUILDINGS,
                    setBuilding,
                    'Select building',
               )}
          </ImageBackground>
     );
};

export default RequestAccessScreen;

const styles = StyleSheet.create({
     background: {
          flex: 1,
     },
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
     },
     keyboardContainer: {
          width: '100%',
     },
     card: {
          width: '100%',
          maxWidth: 380,
          alignSelf: 'center',
          borderRadius: 24,
          paddingHorizontal: 24,
          paddingVertical: 28,
          backgroundColor: 'rgba(255,255,255,0.96)',
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
          elevation: 6,
     },
     logoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 22,
     },
     logo: {
          width: 40,
          height: 40,
          marginRight: 8,
     },
     appName: {
          fontSize: 18,
     },
     title: {
          fontSize: 24,
          fontWeight: '700',
          marginBottom: 6,
     },
     subtitle: {
          fontSize: 14,
          color: '#555',
          marginBottom: 20,
     },
     fieldGroup: {
          marginBottom: 12,
     },
     fieldLabel: {
          fontSize: 13,
          color: '#444',
          marginBottom: 4,
     },
     selectInput: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)',
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: '#f7f7fb',
     },
     selectText: {
          flex: 1,
          fontSize: 14,
          color: '#333',
     },
     selectChevron: {
          fontSize: 16,
          color: '#888',
          marginLeft: 8,
     },
     backToLoginButton: {
          marginTop: 20,
          alignItems: 'center',
     },
     backToLoginText: {
          fontSize: 14,
          color: PRIMARY_COLOR,
          fontWeight: '600',
     },
     // Modal styles
     modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
     },
     modalContent: {
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#fff',
          borderRadius: 18,
          paddingHorizontal: 18,
          paddingVertical: 16,
     },
     modalTitle: {
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 8,
     },
     modalItem: {
          paddingVertical: 10,
     },
     modalItemText: {
          fontSize: 14,
          color: '#333',
     },
     modalCloseButton: {
          marginTop: 10,
          alignSelf: 'flex-end',
     },
     modalCloseText: {
          fontSize: 14,
          color: PRIMARY_COLOR,
     },
});
