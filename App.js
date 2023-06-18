import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button  } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Paho from 'paho-mqtt';
import { Icon } from 'react-native-elements';
import { Audio } from 'expo-av';

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
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const mqttClient = new Paho.Client(mqttConfig.broker, mqttConfig.port, mqttConfig.clientId);

const App = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();  
  const [isFire, setIsFire] = useState(false);
  const [soundObject, setSoundObject] = useState('');

  const playSound = async () => {
    try {
      await Audio.setAudioModeAsync({staysActiveInBackground: true});
      const soundObject = new Audio.Sound();
      await soundObject.loadAsync(require('./assets/emergency_alert.mp3'));
      await soundObject.setVolumeAsync(1.0);
      await soundObject.playAsync();
      setSoundObject(soundObject);
      // Você pode adicionar outras ações após a reprodução do som, se necessário.
    } catch (error) {
      console.log('Ocorreu um erro ao reproduzir o som:', error);
    }
  };

  const stopSound = async () => {
    if (soundObject) {
      await soundObject.stopAsync();
    }
  };

  const resetApp = () => {
    setIsFire(false);
    stopSound();
  };

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
        alert("Sua casa está pegando fogo, ligue para os bombeiros");
        playSound();
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
      {isFire ? 
      <View style={styles.button}>
        <Button title='Resetar' onPress={resetApp}></Button>
      </View>
     : null }
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
  button: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  }
});
function schedulePushNotification() {
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
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
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
