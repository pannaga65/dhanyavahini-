import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_core/firebase_core.dart';
import 'theme/app_theme.dart';
import 'screens/main_scaffold.dart';
import 'screens/home_screen.dart';
import 'screens/product_details_screen.dart';
import 'screens/cart_screen.dart';
import 'screens/bids_screen.dart';
import 'screens/live_bid_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ProviderScope(child: MyApp()));
}

final _router = GoRouter(
  initialLocation: '/',
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
          builder: (context, state) => const Scaffold(body: Center(child: Text('Orders Screen'))),
        ),
        GoRoute(
          path: '/bids',
          builder: (context, state) => const BidsScreen(),
        ),
      ],
    ),
    GoRoute(
      path: '/live_bid/:id',
      builder: (context, state) => LiveBidScreen(bidId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/product/:id',
      builder: (context, state) => ProductDetailsScreen(productId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/cart',
      builder: (context, state) => const CartScreen(),
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
