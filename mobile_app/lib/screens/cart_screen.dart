import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Shopping Cart'),
      ),
      body: cartItems.isEmpty
          ? const Center(
              child: Text('Your cart is empty', style: TextStyle(color: AppTheme.textLight, fontSize: 18)),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: cartItems.length,
              itemBuilder: (context, index) {
                final item = cartItems[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: AppTheme.softShadow,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.inventory_2, color: AppTheme.textLight),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            Text('${item.quantity} Quintals @ ${currencyFormat.format(item.price)}', 
                              style: const TextStyle(color: AppTheme.textLight)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () => cartNotifier.removeItem(item.productId),
                      )
                    ],
                  ),
                );
              },
            ),
      bottomNavigationBar: cartItems.isEmpty ? null : Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: AppTheme.softShadow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Subtotal', style: TextStyle(color: AppTheme.textLight)),
                  Text(currencyFormat.format(cartNotifier.subtotal), style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('GST (5%)', style: TextStyle(color: AppTheme.textLight)),
                  Text(currencyFormat.format(cartNotifier.gst), style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(currencyFormat.format(cartNotifier.total), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryAction)),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryAction,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () async {
                    if (cartItems.isEmpty) return;
                    
                    try {
                      final callable = FirebaseFunctions.instance.httpsCallable('placeSecureOrder');
                      
                      final itemsData = cartItems.map((item) {
                        return {
                          'productId': item.productId,
                          'quantity': item.quantity,
                        };
                      }).toList();
                      
                      await callable.call({'items': itemsData});
                      
                      cartNotifier.clear();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order Placed Securely!')));
                        Navigator.of(context).pop();
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to place order: $e')));
                      }
                    }
                  },
                  child: const Text('Place Order', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
