import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'theme/app_theme.dart';
import 'screens/main_scaffold.dart';
import 'screens/home_screen.dart';
import 'screens/product_details_screen.dart';
import 'screens/cart_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/privacy_policy_screen.dart';
import 'screens/notifications_screen.dart';

import 'screens/login_screen.dart';
import 'screens/category_screen.dart';
import 'screens/all_products_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'providers/notification_provider.dart';

// Must be a top-level function for FCM background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Background messages with 'notification' payload are automatically shown
  // by the system, so no additional handling is needed here.
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Setup FCM background handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // Initialize local notifications (creates Android channel)
  await initLocalNotifications();
  
  // Setup foreground FCM listeners
  await setupFCMListeners();
  
  runApp(const ProviderScope(child: MyApp()));
}

final _router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final isLoggedIn = FirebaseAuth.instance.currentUser != null;
    final isGoingToLogin = state.uri.toString() == '/login';
    if (!isLoggedIn && !isGoingToLogin) return '/login';
    if (isLoggedIn && isGoingToLogin) return '/';
    return null;
  },
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const HomeScreen(),
        ),
        GoRoute(
          path: '/orders',
          builder: (context, state) => const OrdersScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
        ),
        GoRoute(
          path: '/cart',
          builder: (context, state) => const CartScreen(),
        ),
      ],
    ),
    GoRoute(
      path: '/product/:id',
      builder: (context, state) => ProductDetailsScreen(productId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/privacy-policy',
      builder: (context, state) => const PrivacyPolicyScreen(),
    ),
    GoRoute(
      path: '/category/:name',
      builder: (context, state) => CategoryScreen(categoryName: state.pathParameters['name']!),
    ),
    GoRoute(
      path: '/all-products',
      builder: (context, state) => AllProductsScreen(searchQuery: state.uri.queryParameters['query']),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
  ],
);

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Dhanyavahini',
      theme: AppTheme.lightTheme,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
