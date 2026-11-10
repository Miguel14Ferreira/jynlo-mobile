import React from 'react';
import {Redirect} from 'expo-router';
// The centre action is handled by the tab bar; this route is a safe fallback
// for deep links and does not contain a duplicate creation workflow.
export default function CreateTabFallback(){return <Redirect href="/(tabs)"/>;}
