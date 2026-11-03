import React from 'react';
import {Redirect} from 'expo-router';
/** Backwards-compatible feed link; canonical mobile feed is the home tab. */
export default function FeedRedirect(){return <Redirect href="/(tabs)"/>;}
