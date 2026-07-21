import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
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
    
    final gstAmount = cartNotifier.totalGst;
    final totalAmount = cartNotifier.total;

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
                            Text('${item.quantity} Kg @ ${currencyFormat.format(item.price)}/kg', 
                              style: const TextStyle(color: AppTheme.textLight)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Remove Item?'),
                              content: const Text('Are you sure you want to remove this item from your cart?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                  onPressed: () {
                                    cartNotifier.removeItem(item.productId);
                                    Navigator.pop(context);
                                  },
                                  child: const Text('REMOVE', style: TextStyle(color: Colors.white)),
                                ),
                              ],
                            ),
                          );
                        },
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
                  Text('Total GST', style: const TextStyle(color: AppTheme.textLight)),
                  Text(currencyFormat.format(gstAmount), style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(currencyFormat.format(totalAmount), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryAction)),
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
                    
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Place Order?'),
                        content: Text('Are you sure you want to place this order for ${currencyFormat.format(totalAmount)}?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryAction),
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('CONFIRM', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    );
                    
                    if (confirm != true) return;
                    
                    try {
                      final db = FirebaseFirestore.instance;
                      final user = FirebaseAuth.instance.currentUser;
                      if (user == null) throw Exception("Not logged in");

                      // Fetch user profile to get addresses and GST details
                      final userDoc = await db.collection('users').doc(user.uid).get();
                      final userData = userDoc.data() ?? {};
                      
                      final billingAddress = userData['billingAddress'] ?? '';
                      final shippingAddress = userData['shippingAddress'] ?? '';
                      final customerGst = userData['gstNumber'] ?? '';

                      final batch = db.batch();
                      final orderRef = db.collection('orders').doc();
                      
                      // 1. Create order
                      final itemsData = cartItems.map((item) {
                        return {
                          'productId': item.productId,
                          'name': item.name,
                          'quantityKg': item.quantity,
                          'basePriceKg': item.price,
                          'lineTotal': item.price * item.quantity,
                          'gstPercentage': item.gstPercentage,
                          'lineGst': (item.price * item.quantity) * (item.gstPercentage / 100),
                        };
                      }).toList();
                      
                      batch.set(orderRef, {
                        'customerId': user.uid,
                        'customerName': user.displayName ?? "Customer",
                        'customerGst': customerGst,
                        'billingAddress': billingAddress,
                        'shippingAddress': shippingAddress,
                        'items': itemsData,
                        'subtotal': cartNotifier.subtotal,
                        'gstAmount': gstAmount,
                        'totalAmount': totalAmount,
                        'status': 'Inquiry',
                        'paymentStatus': 'Pending',
                        'createdAt': FieldValue.serverTimestamp(),
                        'updatedAt': FieldValue.serverTimestamp(),
                      });

                      // 2. Decrement inventory securely
                      for (var item in cartItems) {
                        final invRef = db.collection('inventory').doc(item.productId);
                        batch.update(invRef, {
                          'availableStockKg': FieldValue.increment(-item.quantity),
                          'allocatedStockKg': FieldValue.increment(item.quantity),
                          'lastUpdated': FieldValue.serverTimestamp(),
                        });
                      }

                      await batch.commit();
                      
                      cartNotifier.clear();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: const Text('Order Placed Successfully!'),
                          backgroundColor: AppTheme.primaryAction,
                          behavior: SnackBarBehavior.floating,
                        ));
                        context.go('/orders');
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
