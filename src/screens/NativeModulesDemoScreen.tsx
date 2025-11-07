import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BatteryModule,
  BrightnessModule,
  SensorsModule,
  DeviceInfoModule,
  FlashlightModule,
} from "../native-modules";

export default function NativeModulesDemoScreen() {
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number;
    state: number;
  } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [sensorData, setSensorData] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const getBatteryStateText = (state: number) => {
    switch (state) {
      case 0:
        return "Unknown";
      case 1:
        return "Unplugged";
      case 2:
        return "Charging";
      case 3:
        return "Full";
      default:
        return "Unknown";
    }
  };

  const handleGetBattery = async () => {
    try {
      setLoading("battery");
      const info = await BatteryModule.getBatteryInfo();
      setBatteryInfo(info);
    } catch (error) {
      Alert.alert("Error", `Failed to get battery info: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleSetBrightness = async (level: number) => {
    try {
      setLoading("brightness");
      await BrightnessModule.setBrightness(level);
      Alert.alert("Success", `Brightness set to ${Math.round(level * 100)}%`);
    } catch (error) {
      Alert.alert("Error", `Failed to set brightness: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleGetSensorData = async (type: "accelerometer" | "gyroscope" | "magnetometer") => {
    try {
      setLoading(type);
      const data = await SensorsModule.getSensorData(type, 1000);
      setSensorData(data);
    } catch (error) {
      Alert.alert("Error", `Failed to get sensor data: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleGetDeviceInfo = async () => {
    try {
      setLoading("device");
      const info = await DeviceInfoModule.getDeviceInfo();
      setDeviceInfo(info);
    } catch (error) {
      Alert.alert("Error", `Failed to get device info: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleToggleFlashlight = async () => {
    try {
      setLoading("flashlight");
      const newState = !flashlightOn;
      await FlashlightModule.setTorchMode(newState);
      setFlashlightOn(newState);
    } catch (error) {
      Alert.alert("Error", `Failed to toggle flashlight: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const ActionButton = ({
    title,
    onPress,
    isLoading,
    variant = "primary",
  }: {
    title: string;
    onPress: () => void;
    isLoading: boolean;
    variant?: "primary" | "secondary";
  }) => (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className={`p-4 rounded-xl ${
        variant === "primary" ? "bg-blue-500" : "bg-gray-700"
      } ${isLoading ? "opacity-50" : ""}`}
    >
      <Text className="text-white text-center font-semibold">
        {isLoading ? "Loading..." : title}
      </Text>
    </Pressable>
  );

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="bg-gray-800 p-4 rounded-xl mb-4">
      <Text className="text-white font-bold text-lg mb-2">{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-white text-3xl font-bold mb-2">Native Modules Demo</Text>
          <Text className="text-gray-400 mb-6">
            Test native iOS Turbo Modules compiled on macOS runner
          </Text>

          {/* Battery Module */}
          <InfoCard title="Battery Module">
            <ActionButton
              title="Get Battery Info"
              onPress={handleGetBattery}
              isLoading={loading === "battery"}
            />
            {batteryInfo && (
              <View className="mt-4 p-3 bg-gray-900 rounded-lg">
                <Text className="text-white">Level: {batteryInfo.level.toFixed(1)}%</Text>
                <Text className="text-white">
                  State: {getBatteryStateText(batteryInfo.state)}
                </Text>
              </View>
            )}
          </InfoCard>

          {/* Brightness Module */}
          <InfoCard title="Brightness Module">
            <View className="gap-2">
              <ActionButton
                title="Set Brightness 25%"
                onPress={() => handleSetBrightness(0.25)}
                isLoading={loading === "brightness"}
                variant="secondary"
              />
              <ActionButton
                title="Set Brightness 50%"
                onPress={() => handleSetBrightness(0.5)}
                isLoading={loading === "brightness"}
                variant="secondary"
              />
              <ActionButton
                title="Set Brightness 100%"
                onPress={() => handleSetBrightness(1.0)}
                isLoading={loading === "brightness"}
                variant="secondary"
              />
            </View>
          </InfoCard>

          {/* Sensors Module */}
          <InfoCard title="Sensors Module">
            <View className="gap-2">
              <ActionButton
                title="Get Accelerometer"
                onPress={() => handleGetSensorData("accelerometer")}
                isLoading={loading === "accelerometer"}
                variant="secondary"
              />
              <ActionButton
                title="Get Gyroscope"
                onPress={() => handleGetSensorData("gyroscope")}
                isLoading={loading === "gyroscope"}
                variant="secondary"
              />
              <ActionButton
                title="Get Magnetometer"
                onPress={() => handleGetSensorData("magnetometer")}
                isLoading={loading === "magnetometer"}
                variant="secondary"
              />
            </View>
            {sensorData && (
              <View className="mt-4 p-3 bg-gray-900 rounded-lg">
                <Text className="text-white">X: {sensorData.x.toFixed(4)}</Text>
                <Text className="text-white">Y: {sensorData.y.toFixed(4)}</Text>
                <Text className="text-white">Z: {sensorData.z.toFixed(4)}</Text>
              </View>
            )}
          </InfoCard>

          {/* Device Info Module */}
          <InfoCard title="Device Info Module">
            <ActionButton
              title="Get Device Info"
              onPress={handleGetDeviceInfo}
              isLoading={loading === "device"}
            />
            {deviceInfo && (
              <View className="mt-4 p-3 bg-gray-900 rounded-lg">
                <Text className="text-white">Model: {deviceInfo.model}</Text>
                <Text className="text-white">
                  OS: {deviceInfo.systemName} {deviceInfo.systemVersion}
                </Text>
                <Text className="text-white">Name: {deviceInfo.name}</Text>
                <Text className="text-white">
                  Low Power Mode: {deviceInfo.isLowPowerMode ? "Yes" : "No"}
                </Text>
              </View>
            )}
          </InfoCard>

          {/* Flashlight Module */}
          <InfoCard title="Flashlight Module">
            <ActionButton
              title={flashlightOn ? "Turn Off Flashlight" : "Turn On Flashlight"}
              onPress={handleToggleFlashlight}
              isLoading={loading === "flashlight"}
            />
          </InfoCard>

          <View className="mb-8">
            <Text className="text-gray-500 text-sm text-center">
              All modules compiled with Xcode on macOS-15 runner
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
