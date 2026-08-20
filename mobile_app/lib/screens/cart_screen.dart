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
import '../providers/notification_provider.dart';

class SelectedAddressIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;
  void set(int value) => state = value;
}

final selectedAddressIndexProvider =
    NotifierProvider<SelectedAddressIndexNotifier, int>(
      SelectedAddressIndexNotifier.new,
    );

class UseBillingAsShippingNotifier extends Notifier<bool> {
  @override
  bool build() => false;
  void set(bool value) => state = value;
}

final useBillingAsShippingProvider =
    NotifierProvider<UseBillingAsShippingNotifier, bool>(
      UseBillingAsShippingNotifier.new,
    );

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Inquiry Cart')),
      body: cartItems.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.shopping_cart_outlined,
                    size: 80,
                    color: AppTheme.textLight.withValues(alpha: 0.5),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Your cart is empty',
                    style: TextStyle(color: AppTheme.textLight, fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => context.push('/all-products'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryAction,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                    child: const Text(
                      'Start Shopping',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${cartItems.length} Items',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => context.push('/all-products'),
                        icon: const Icon(Icons.add_shopping_cart, size: 18),
                        label: const Text('Continue Shopping'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.primaryAction,
                        ),
                      ),
                    ],
                  ),
                ),
                // Delivery Address Card
                _DeliveryAddressCard(),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 8,
                    ),
                    itemCount: cartItems.length,
                    itemBuilder: (context, index) {
                      final item = cartItems[index];

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
                          child: const Icon(
                            Icons.delete,
                            color: Colors.white,
                            size: 28,
                          ),
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
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.grey.withValues(alpha: 0.15),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.02),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 70,
                                height: 70,
                                decoration: BoxDecoration(
                                  color: AppTheme.background,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: item.imageUrl.isNotEmpty
                                    ? CachedNetworkImage(
                                        imageUrl: item.imageUrl,
                                        fit: BoxFit.cover,
                                        placeholder: (context, url) =>
                                            const Padding(
                                              padding: EdgeInsets.all(16.0),
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                              ),
                                            ),
                                        errorWidget: (context, url, error) =>
                                            const Icon(
                                              Icons.inventory_2,
                                              color: AppTheme.textLight,
                                            ),
                                      )
                                    : const Icon(
                                        Icons.inventory_2,
                                        color: AppTheme.textLight,
                                      ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Quantity: ${item.quantity} Kg',
                                      style: const TextStyle(
                                        color: AppTheme.textLight,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  IconButton(
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    icon: const Icon(
                                      Icons.close,
                                      color: Colors.grey,
                                      size: 20,
                                    ),
                                    onPressed: () =>
                                        cartNotifier.removeItem(item.productId),
                                  ),
                                  const SizedBox(height: 16),
                                  Container(
                                    decoration: BoxDecoration(
                                      color: AppTheme.background,
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 4,
                                      vertical: 4,
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        GestureDetector(
                                          onTap: () =>
                                              cartNotifier.updateQuantity(
                                                item.productId,
                                                item.quantity -
                                                    item.incrementStepKg,
                                              ),
                                          child: Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: const BoxDecoration(
                                              color: Colors.white,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.remove,
                                              size: 14,
                                              color: AppTheme.textDark,
                                            ),
                                          ),
                                        ),
                                        Container(
                                          constraints: const BoxConstraints(
                                            minWidth: 40,
                                          ),
                                          alignment: Alignment.center,
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                          ),
                                          child: Text(
                                            '${item.quantity}',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13,
                                              color: AppTheme.textDark,
                                            ),
                                          ),
                                        ),
                                        GestureDetector(
                                          onTap: () =>
                                              cartNotifier.updateQuantity(
                                                item.productId,
                                                item.quantity +
                                                    item.incrementStepKg,
                                              ),
                                          child: Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: const BoxDecoration(
                                              color: Colors.white,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.add,
                                              size: 14,
                                              color: AppTheme.textDark,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Kg',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: AppTheme.textLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
      bottomNavigationBar: cartItems.isEmpty
          ? null
          : Container(
              padding: const EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: 32,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${cartItems.length} ITEMS',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textLight,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${cartItems.fold<int>(0, (sum, item) => sum + item.quantity)} Kg Total Volume',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textDark,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryAction,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () async {
                          if (cartItems.isEmpty) return;
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                              title: const Text('Submit Inquiry?'),
                              content: Text(
                                'Send an inquiry for ${cartItems.length} items (${cartItems.fold<int>(0, (sum, item) => sum + item.quantity)} Kg total volume)? Our wholesale team will get back to you with the best personalized pricing for your location.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      Navigator.pop(context, false),
                                  child: const Text(
                                    'CANCEL',
                                    style: TextStyle(color: AppTheme.textLight),
                                  ),
                                ),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryAction,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text(
                                    'SUBMIT',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                          );

                          if (confirm != true) return;

                          // Show full-screen loading overlay
                          showDialog(
                            context: context,
                            barrierDismissible: false,
                            builder: (BuildContext context) {
                              return const Dialog(
                                backgroundColor: Colors.transparent,
                                elevation: 0,
                                child: Center(
                                  child: CircularProgressIndicator(
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      AppTheme.primaryAction,
                                    ),
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

                            final selectedAddressIndex = ref.read(
                              selectedAddressIndexProvider,
                            );
                            final useBillingAsShipping = ref.read(
                              useBillingAsShippingProvider,
                            );

                            final callable = functions.httpsCallable(
                              'placeSecureOrder',
                            );
                            await callable.call({
                              'items': itemsData,
                              'selectedAddressIndex': selectedAddressIndex,
                              'useBillingAsShipping': useBillingAsShipping,
                            });

                            cartNotifier.clear();
                            if (context.mounted) {
                              Navigator.of(
                                context,
                                rootNavigator: true,
                              ).pop(); // Close the loading dialog

                              await showDialog(
                                context: context,
                                barrierDismissible: false,
                                builder: (context) => AlertDialog(
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  icon: const Icon(
                                    Icons.check_circle,
                                    color: AppTheme.primaryAction,
                                    size: 64,
                                  ),
                                  title: const Text(
                                    'Inquiry Placed!',
                                    textAlign: TextAlign.center,
                                  ),
                                  content: const Text(
                                    'Your request has been sent to our wholesale team. Enable notifications to get instant updates on your inquiry status and pricing.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: AppTheme.textLight),
                                  ),
                                  actionsAlignment: MainAxisAlignment.center,
                                  actions: [
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.primaryAction,
                                        minimumSize: const Size(
                                          double.infinity,
                                          48,
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                      ),
                                      onPressed: () async {
                                        Navigator.pop(
                                          context,
                                        ); // Close the dialog
                                        // Request notification permissions
                                        requestAndSaveFCMToken();
                                        context.go('/orders');
                                      },
                                      child: const Text(
                                        'Enable Notifications',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    TextButton(
                                      onPressed: () {
                                        Navigator.pop(
                                          context,
                                        ); // Close the dialog
                                        context.go('/orders');
                                      },
                                      child: const Text(
                                        'Not Now',
                                        style: TextStyle(
                                          color: AppTheme.textLight,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }
                          } on FirebaseFunctionsException catch (e) {
                            if (context.mounted) {
                              Navigator.of(
                                context,
                                rootNavigator: true,
                              ).pop(); // Close the loading dialog
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Failed to place order: ${e.message}',
                                  ),
                                ),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              Navigator.of(
                                context,
                                rootNavigator: true,
                              ).pop(); // Close the loading dialog
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Failed to place order: $e'),
                                ),
                              );
                            }
                          }
                        },
                        child: const Text(
                          'Submit Inquiry',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
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
      stream: FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .snapshots(),
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
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: displayAddress != null
                ? AppTheme.surface
                : const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: displayAddress != null
                  ? Colors.grey.withValues(alpha: 0.2)
                  : Colors.orange.shade300,
            ),
            boxShadow: [
              if (displayAddress != null)
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: displayAddress != null
                      ? AppTheme.primaryAction.withValues(alpha: 0.1)
                      : Colors.orange.shade100,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  displayAddress != null
                      ? Icons.location_on_rounded
                      : Icons.warning_amber_rounded,
                  color: displayAddress != null
                      ? AppTheme.primaryAction
                      : Colors.orange.shade700,
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayAddress != null
                          ? 'Deliver to'
                          : 'No shipping address',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: displayAddress != null
                            ? AppTheme.textLight
                            : Colors.orange.shade800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      displayAddress ??
                          'Please add a shipping address in your Profile before placing an order.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: displayAddress != null
                            ? AppTheme.textDark
                            : Colors.orange.shade900,
                        height: 1.4,
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
                  final addresses =
                      (userData['mailingAddresses'] as List<dynamic>?)
                          ?.cast<String>() ??
                      [];
                  final billingAddress =
                      (userData['billingAddress'] as String?) ?? '';

                  final result = await showModalBottomSheet<Map<String, dynamic>>(
                    context: context,
                    backgroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(24),
                      ),
                    ),
                    builder: (ctx) {
                      return Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Center(
                              child: Container(
                                width: 40,
                                height: 4,
                                margin: const EdgeInsets.only(bottom: 16),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade300,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                            const Text(
                              'Select Shipping Address',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            if (billingAddress.isNotEmpty)
                              Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                color: const Color(0xFFF0FFF4),
                                child: ListTile(
                                  leading: const Icon(
                                    Icons.location_city,
                                    color: Colors.green,
                                  ),
                                  title: Text(
                                    billingAddress,
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                  subtitle: const Text(
                                    'Same as Billing Address',
                                    style: TextStyle(
                                      color: Colors.green,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () =>
                                      Navigator.pop(ctx, {'useBilling': true}),
                                ),
                              ),
                            ...List.generate(addresses.length, (i) {
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ListTile(
                                  leading: const Icon(
                                    Icons.local_shipping_outlined,
                                  ),
                                  title: Text(
                                    addresses[i],
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                  subtitle: i == 0
                                      ? const Text(
                                          'Default Shipping',
                                          style: TextStyle(
                                            color: Colors.blue,
                                            fontSize: 12,
                                          ),
                                        )
                                      : null,
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
                      ref
                          .read(useBillingAsShippingProvider.notifier)
                          .set(false);
                      ref
                          .read(selectedAddressIndexProvider.notifier)
                          .set(result['index'] ?? 0);
                    }
                  }
                },
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primaryAction,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Change',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
