import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen    from './src/screens/WelcomeScreen';
import CaptureScreen    from './src/screens/CaptureScreen';
import AnalyzingScreen  from './src/screens/AnalyzingScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import ProposalScreen   from './src/screens/ProposalScreen';
import SimulatorScreen  from './src/screens/SimulatorScreen';
import HistoryScreen    from './src/screens/HistoryScreen';
import QuickEstimateScreen from './src/screens/QuickEstimateScreen';
import GuideScreen      from './src/screens/GuideScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false, animationEnabled: true }}
      >
        <Stack.Screen name="Welcome"       component={WelcomeScreen} />
        <Stack.Screen name="Guide"         component={GuideScreen} />
        <Stack.Screen name="Capture"       component={CaptureScreen} />
        <Stack.Screen name="QuickEstimate" component={QuickEstimateScreen} />
        <Stack.Screen name="Analyzing"    component={AnalyzingScreen} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="Proposal"     component={ProposalScreen} />
        <Stack.Screen name="Simulator"    component={SimulatorScreen} />
        <Stack.Screen name="History"      component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
