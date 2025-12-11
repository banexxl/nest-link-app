import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
     handleNotification: async () => ({
          shouldShowAlert: true,
          // Newer Expo Notifications behavior fields
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
     }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
     if (!Device.isDevice) {
          console.warn('Push notifications only work on a physical device.');
          return null;
     }

     const { status: existingStatus } = await Notifications.getPermissionsAsync();
     let finalStatus = existingStatus;

     if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
     }

     if (finalStatus !== 'granted') {
          console.warn('Failed to get push token for push notification!');
          return null;
     }

     const token = await Notifications.getExpoPushTokenAsync();
     const expoPushToken = token?.data ?? null;

     if (!expoPushToken) {
          console.warn('Expo push token is null');
          return null;
     }

     return expoPushToken;
}

export async function sendPushNotification(
     expoPushToken: string,
     {
          title,
          body,
          data,
     }: { title: string; body: string; data?: Record<string, unknown> }
) {
     const message = {
          to: expoPushToken,
          sound: 'default',
          title,
          body,
          data: data ?? {},
     };

     await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
               Accept: 'application/json',
               'Accept-encoding': 'gzip, deflate',
               'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
     });
}
