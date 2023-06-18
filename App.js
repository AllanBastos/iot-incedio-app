import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Poho from 'paho-mqtt';

const FIRE_TOPIC = 'casa/incendio';

const mqttConfig = {
  broker: 'mqtt.eclipseprojects.io',
  port: 80,
  clientId: '123156',
  username: undefined,
  password: undefined,
};

const mqttClient = new Poho.Client(mqttConfig.broker, mqttConfig.port, mqttConfig.clientId);

const App = () => {
  const [isFire, setIsFire] = useState(false);

  console.log("iniciando app")

  useEffect(() => {
    console.log("iniciando conexão com o broker mqtt")
    mqttClient.connect({
      useSSL: false,
      reconnect: true,
      onSuccess: () => {
        console.log('Conexão MQTT estabelecida');
        mqttClient.subscribe(FIRE_TOPIC);
      },
      onFailure: (error) => {
        console.log('Erro na conexão MQTT:', error.errorMessage);
      },
    });

    mqttClient.isConnected();

    mqttClient.onMessageArrived = (message) => {
      console.log('Mensagem recebida:', message.payloadString);

      if (message.destinationName === FIRE_TOPIC) {
        setIsFire(true);
        // Execute qualquer ação adicional aqui, como mostrar notificações
      }
    };

    mqttClient.onConnectionLost = (error) => {
      console.log('Conexão MQTT perdida:', error);
    };

    return () => {
      mqttClient.disconnect();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status da Casa</Text>
      {isFire ? (
        <View>
          <Image source={require('./fogo.png')} style={styles.icon} />
          <Text style={styles.status}>Fogo na casa!</Text>
        </View>
      ) : (
        <View>
          <Image source={require('./ok.png')} style={styles.icon} />
          <Text style={styles.status}>Nenhum incêndio detectado</Text>
        </View>
      )}
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
  icon: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default App;
