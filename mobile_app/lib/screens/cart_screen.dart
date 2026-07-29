import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';

class SelectedAddressIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;
  void set(int value) => state = value;
}
final selectedAddressIndexProvider = NotifierProvider<SelectedAddressIndexNotifier, int>(SelectedAddressIndexNotifier.new);

class UseBillingAsShippingNotifier extends Notifier<bool> {
  @override
  bool build() => false;
  void set(bool value) => state = value;
}
final useBillingAsShippingProvider = NotifierProvider<UseBillingAsShippingNotifier, bool>(UseBillingAsShippingNotifier.new);

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
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shopping_cart_outlined, size: 80, color: AppTheme.textLight.withValues(alpha: 0.5)),
                  const SizedBox(height: 16),
                  const Text('Your cart is empty', style: TextStyle(color: AppTheme.textLight, fontSize: 18)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => context.push('/all-products'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryAction,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    child: const Text('Start Shopping', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${cartItems.length} Items', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      TextButton.icon(
                        onPressed: () => context.push('/all-products'),
                        icon: const Icon(Icons.add_shopping_cart, size: 18),
                        label: const Text('Continue Shopping'),
                        style: TextButton.styleFrom(foregroundColor: AppTheme.primaryAction),
                      ),
                    ],
                  ),
                ),
                // Delivery Address Card
                _DeliveryAddressCard(),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: cartItems.length,
                    itemBuilder: (context, index) {
                      final item = cartItems[index];
                      final lineTotal = item.price * item.quantity;
                      
                      return Dismissible(
                        key: Key(item.productId),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 24),
                          child: const Icon(Icons.delete, color: Colors.white, size: 28),
                        ),
                        onDismissed: (_) {
                          cartNotifier.removeItem(item.productId);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${item.name} removed from cart'),
                              action: SnackBarAction(
                                label: 'UNDO',
                                textColor: Colors.white,
                                onPressed: () => cartNotifier.addItem(item),
                              ),
                            ),
                          );
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: AppTheme.modernShadow,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 70,
                                height: 70,
                                decoration: BoxDecoration(
                                  color: AppTheme.background,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: item.imageUrl.isNotEmpty
                                    ? CachedNetworkImage(
                                        imageUrl: item.imageUrl,
                                        fit: BoxFit.cover,
                                        placeholder: (context, url) => const Padding(
                                          padding: EdgeInsets.all(16.0),
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        ),
                                        errorWidget: (context, url, error) => const Icon(Icons.inventory_2, color: AppTheme.textLight),
                                      )
                                    : const Icon(Icons.inventory_2, color: AppTheme.textLight),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                    const SizedBox(height: 4),
                                    Text('${currencyFormat.format(item.price)} / Kg', 
                                      style: const TextStyle(color: AppTheme.textLight, fontSize: 13)),
                                    if (item.gstPercentage > 0)
                                      Text('+ ${item.gstPercentage}% GST (${currencyFormat.format(lineTotal * (item.gstPercentage/100))})', 
                                        style: const TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 8),
                                    Text('Total: ${currencyFormat.format(lineTotal + (lineTotal * (item.gstPercentage/100)))}', 
                                      style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primaryAction, fontSize: 14)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    icon: const Icon(Icons.close, color: Colors.grey, size: 20),
                                    onPressed: () => cartNotifier.removeItem(item.productId),
                                  ),
                                  const SizedBox(height: 16),
                                  Container(
                                    decoration: BoxDecoration(
                                      border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        GestureDetector(
                                          onTap: () => cartNotifier.updateQuantity(item.productId, item.quantity - item.incrementStepKg),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: const BorderRadius.horizontal(left: Radius.circular(8))),
                                            child: const Icon(Icons.remove, size: 14),
                                          ),
                                        ),
                                        Container(
                                          constraints: const BoxConstraints(minWidth: 36),
                                          alignment: Alignment.center,
                                          padding: const EdgeInsets.symmetric(horizontal: 4),
                                          child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                        ),
                                        GestureDetector(
                                          onTap: () => cartNotifier.updateQuantity(item.productId, item.quantity + item.incrementStepKg),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                            decoration: BoxDecoration(color: AppTheme.primaryAction.withValues(alpha: 0.1), borderRadius: const BorderRadius.horizontal(right: Radius.circular(8))),
                                            child: const Icon(Icons.add, size: 14, color: AppTheme.primaryAction),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text('Kg', style: TextStyle(fontSize: 10, color: AppTheme.textLight, fontWeight: FontWeight.bold)),
                                ],
                              )
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
      bottomNavigationBar: cartItems.isEmpty ? null : Container(
        padding: const EdgeInsets.only(left: 24, right: 24, top: 16, bottom: 32),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, -10),
            )
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Subtotal', style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.w500)),
                  Text(currencyFormat.format(cartNotifier.subtotal), style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textDark)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Taxes (GST)', style: TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.w500)),
                  Text(currencyFormat.format(gstAmount), style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textDark)),
                ],
              ),
              const SizedBox(height: 16),
              Container(height: 1, color: Colors.grey.withValues(alpha: 0.2)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total to Pay', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textDark)),
                  Text(currencyFormat.format(totalAmount), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.primaryAction)),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryAction,
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shadowColor: AppTheme.primaryAction.withValues(alpha: 0.4),
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
                    
                    final selectedAddressIndex = ref.read(selectedAddressIndexProvider);
                    final useBillingAsShipping = ref.read(useBillingAsShippingProvider);
                    
                    if (!context.mounted) return;
                    
                    // Show a non-dismissible loading dialog while the Cloud Function runs
                    showDialog(
                      context: context,
                      barrierDismissible: false,
                      builder: (BuildContext context) {
                        return const Dialog(
                          backgroundColor: Colors.transparent,
                          elevation: 0,
                          child: Center(
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryAction),
                            ),
                          ),
                        );
                      },
                    );
                    
                    try {
                      final functions = FirebaseFunctions.instance;
                      
                      final itemsData = cartItems.map((item) {
                        return {
                          'productId': item.productId,
                          'quantity': item.quantity,
                        };
                      }).toList();

                      final callable = functions.httpsCallable('placeSecureOrder');
                      await callable.call({
                        'items': itemsData,
                        'selectedAddressIndex': selectedAddressIndex,
                        'useBillingAsShipping': useBillingAsShipping,
                      });
                      
                      cartNotifier.clear();
                      if (context.mounted) {
                        Navigator.pop(context); // Close the loading dialog
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: const Text('Order Placed Successfully!'),
                          backgroundColor: AppTheme.primaryAction,
                          behavior: SnackBarBehavior.floating,
                        ));
                        context.go('/orders');
                      }
                    } on FirebaseFunctionsException catch (e) {
                      if (context.mounted) {
                        Navigator.pop(context); // Close the loading dialog
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to place order: ${e.message}')));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        Navigator.pop(context); // Close the loading dialog
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

class _DeliveryAddressCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const SizedBox.shrink();

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(user.uid).snapshots(),
      builder: (context, snapshot) {
        String? displayAddress;
        
        final selectedIndex = ref.watch(selectedAddressIndexProvider);
        final useBilling = ref.watch(useBillingAsShippingProvider);
        
        Map<String, dynamic>? userData;
        if (snapshot.hasData && snapshot.data!.exists) {
          userData = snapshot.data!.data() as Map<String, dynamic>?;
          
          if (useBilling) {
            displayAddress = userData?['billingAddress'] as String?;
          } else {
            final mailingList = userData?['mailingAddresses'] as List<dynamic>?;
            if (mailingList != null && mailingList.length > selectedIndex) {
              displayAddress = mailingList[selectedIndex].toString();
            } else if (mailingList != null && mailingList.isNotEmpty) {
              displayAddress = mailingList.first.toString();
            }
          }
          
          if (displayAddress == null || displayAddress.trim().isEmpty) {
             displayAddress = userData?['billingAddress'] as String?;
          }
        }

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: displayAddress != null ? Colors.white : const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: displayAddress != null ? AppTheme.primaryAction.withValues(alpha: 0.3) : Colors.orange.shade300,
            ),
          ),
          child: Row(
            children: [
              Icon(
                displayAddress != null ? Icons.local_shipping : Icons.warning_amber_rounded,
                color: displayAddress != null ? AppTheme.primaryAction : Colors.orange.shade700,
                size: 22,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayAddress != null ? 'Deliver to' : 'No shipping address',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: displayAddress != null ? AppTheme.textLight : Colors.orange.shade800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      displayAddress ?? 'Please add a shipping address in your Profile before placing an order.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: displayAddress != null ? AppTheme.textDark : Colors.orange.shade900,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () async {
                  if (userData == null) return;
                  final addresses = (userData['mailingAddresses'] as List<dynamic>?)?.cast<String>() ?? [];
                  final billingAddress = (userData['billingAddress'] as String?) ?? '';
                  
                  final result = await showModalBottomSheet<Map<String, dynamic>>(
                    context: context,
                    backgroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                    builder: (ctx) {
                      return Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Center(
                              child: Container(
                                width: 40, height: 4,
                                margin: const EdgeInsets.only(bottom: 16),
                                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                              ),
                            ),
                            const Text('Select Shipping Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 16),
                            if (billingAddress.isNotEmpty)
                              Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                color: const Color(0xFFF0FFF4),
                                child: ListTile(
                                  leading: const Icon(Icons.location_city, color: Colors.green),
                                  title: Text(billingAddress, style: const TextStyle(fontSize: 14)),
                                  subtitle: const Text('Same as Billing Address', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => Navigator.pop(ctx, {'useBilling': true}),
                                ),
                              ),
                            ...List.generate(addresses.length, (i) {
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                child: ListTile(
                                  leading: const Icon(Icons.local_shipping_outlined),
                                  title: Text(addresses[i], style: const TextStyle(fontSize: 14)),
                                  subtitle: i == 0 ? const Text('Default Shipping', style: TextStyle(color: Colors.blue, fontSize: 12)) : null,
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => Navigator.pop(ctx, {'index': i}),
                                ),
                              );
                            }),
                            const SizedBox(height: 8),
                            // Button to go to profile if they want to add a completely new address
                            Center(
                              child: TextButton.icon(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  context.push('/profile');
                                },
                                icon: const Icon(Icons.add),
                                label: const Text('Add New Address in Profile'),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                  
                  if (result != null) {
                    if (result['useBilling'] == true) {
                      ref.read(useBillingAsShippingProvider.notifier).set(true);
                    } else {
                      ref.read(useBillingAsShippingProvider.notifier).set(false);
                      ref.read(selectedAddressIndexProvider.notifier).set(result['index'] ?? 0);
                    }
                  }
                },
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primaryAction,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Change', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ],
          ),
        );
      },
    );
  }
}
