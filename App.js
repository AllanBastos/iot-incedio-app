import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Paho from 'paho-mqtt';
import { Icon } from 'react-native-elements';

const FIRE_TOPIC = 'casa/incendio';

const mqttConfig = {
  broker: 'mqtt.eclipseprojects.io',
  port: 80,
  clientId: 'clientId',
  username: '',
  password: '',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const mqttClient = new Paho.Client(mqttConfig.broker, mqttConfig.port, mqttConfig.clientId);

const App = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();  
  const [isFire, setIsFire] = useState(false);

  useEffect(() => {
    console.log("configurando notificações");
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });



    console.log("Iniciando conexão com o broker MQTT");
    mqttClient.connect({
      userName: mqttConfig.username,
      password: mqttConfig.password,
      useSSL: false,
      onSuccess: () => {
        console.log('Conexão MQTT estabelecida');
        mqttClient.subscribe(FIRE_TOPIC);
      },
      onFailure: (error) => {
        console.log('Erro na conexão MQTT:', error.errorMessage);
      },
    });

    mqttClient.onMessageArrived = (message) => {
      console.log('Mensagem recebida:', message.payloadString);

      if (message.destinationName === FIRE_TOPIC) {
        setIsFire(true);
        schedulePushNotification();
      }
    };

    mqttClient.onConnectionLost = (error) => {
      console.log('Conexão MQTT perdida:', error.errorMessage);
    };

    return () => {
      mqttClient.disconnect();
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const sendLocalNotificationAsync = async (title, message) => {
    await Notifications.presentLocalNotificationAsync({
      title,
      body: message,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status da Casa</Text>
      <View style={styles.statusContainer}>
        <Icon
          name={isFire ? 'fire' : 'check'}
          type="font-awesome"
          color={isFire ? '#FF0000' : '#00FF00'}
          size={100}
        />
        <Text style={styles.statusText}>
          {isFire ? 'Fogo na casa!' : 'Nenhum incêndio detectado'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000000',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#000000',
  },
});
function schedulePushNotification() {
  console.log("entrou na função schedulePushNotification");
  Notifications.scheduleNotificationAsync({
    content: {
      title: "Sua casa está pegando fogo",
      body: 'Ligue para os bombeiros, sua casa está em cha',
      data: {},
    },
    trigger: null,
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    console.log("entrou na função registerForPushNotificationsAsync");
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("Permissão de notificação: ", finalStatus);
    }
    if (finalStatus !== 'granted') {
      alert('Falha ao obeter permissões de notificações!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Token", token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export default App;
