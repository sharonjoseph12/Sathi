import { Redirect } from "expo-router";
import { useApp } from "../lib/store";

export default function Index() {
  const { me } = useApp();
  if (!me) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
