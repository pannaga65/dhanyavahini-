import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../widgets/bouncy_card.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final user = FirebaseAuth.instance.currentUser;
  final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

  // Normalize status for display and stepper
  String _normalizeStatus(String rawStatus) {
    if (rawStatus.isEmpty) return 'Order Placed';
    final s = rawStatus.toLowerCase();
    if (s == 'inquiry' || s == 'pending') return 'Order Placed';
    if (s == 'confirmed') return 'Confirmed';
    if (s == 'dispatched' || s == 'shipped' || s == 'processing') return 'Dispatched';
    if (s == 'delivered') return 'Delivered';
    if (s == 'rejected' || s == 'cancelled') return 'Cancelled';
    
    // Capitalize first letter as fallback
    return rawStatus[0].toUpperCase() + rawStatus.substring(1);
  }

  // Define steps for the stepper UI — matches admin panel exactly
  final List<String> statusSteps = ['Order Placed', 'Confirmed', 'Dispatched', 'Delivered'];

  @override
  Widget build(BuildContext context) {
    if (user == null) {
      return const Scaffold(body: Center(child: Text('Please log in')));
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: ClipRRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AppBar(
              backgroundColor: AppTheme.background.withValues(alpha: 0.8),
              elevation: 0,
              scrolledUnderElevation: 0,
              centerTitle: true,
              title: const Text('My Orders', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
            ),
          ),
        ),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('orders')
            .where('customerId', isEqualTo: user!.uid)
            .orderBy('createdAt', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error loading orders: ${snapshot.error}'));
          }

          final orders = snapshot.data?.docs ?? [];

          if (orders.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long, size: 80, color: AppTheme.textLight.withValues(alpha: 0.3)),
                  const SizedBox(height: 16),
                  const Text('No orders yet', style: TextStyle(fontSize: 18, color: AppTheme.textLight, fontWeight: FontWeight.w600)),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.only(top: 100, left: 16, right: 16, bottom: 40),
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final doc = orders[index];
              final data = doc.data() as Map<String, dynamic>;
              
              final rawStatus = data['status'] ?? 'Inquiry';
              final status = _normalizeStatus(rawStatus);
              final paymentStatus = data['paymentStatus'] ?? 'Pending';
              final invoiceNo = data['invoiceNo'];
              
              // Safely handle total amount parsing
              final total = data['totalAmount'] ?? data['total'] ?? 0.0;
              final items = (data['items'] as List<dynamic>?) ?? [];
              
              final dateStr = data['createdAt'] != null 
                  ? DateFormat('dd MMM yyyy, hh:mm a').format((data['createdAt'] as Timestamp).toDate()) 
                  : 'Unknown Date';

              int currentStepIndex = statusSteps.indexOf(status);

              final isCancelled = status == 'Cancelled';

              return Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: BouncyCard(
                  onTap: () {
                    // Could navigate to Order Details screen here if one exists
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: AppTheme.modernShadow,
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: isCancelled ? Colors.red.withValues(alpha: 0.05) : AppTheme.primaryAction.withValues(alpha: 0.05),
                            border: const Border(bottom: BorderSide(color: Color(0xFFF3F4F6))),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'ORD-${doc.id.substring(0, 6).toUpperCase()}', 
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.textDark)
                                  ),
                                  const SizedBox(height: 4),
                                  Text(dateStr, style: const TextStyle(color: AppTheme.textLight, fontSize: 12, fontWeight: FontWeight.w500)),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isCancelled ? Colors.red.shade100 : AppTheme.secondaryAccent.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  status.toUpperCase(),
                                  style: TextStyle(
                                    color: isCancelled ? Colors.red.shade700 : AppTheme.secondaryAccent, 
                                    fontWeight: FontWeight.w800, 
                                    fontSize: 10,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              )
                            ],
                          ),
                        ),
                        
                        // Tracking Stepper
                        if (!isCancelled)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                            child: Row(
                              children: List.generate(statusSteps.length * 2 - 1, (i) {
                                if (i % 2 == 0) {
                                  // Node
                                  int stepIdx = i ~/ 2;
                                  bool isCompleted = currentStepIndex != -1 && stepIdx <= currentStepIndex;
                                  bool isCurrent = stepIdx == currentStepIndex;
                                  
                                  return Column(
                                    children: [
                                      Container(
                                        width: 24,
                                        height: 24,
                                        decoration: BoxDecoration(
                                          color: isCompleted ? AppTheme.primaryAction : AppTheme.background,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: isCompleted ? AppTheme.primaryAction : Colors.grey.shade300,
                                            width: 2,
                                          ),
                                        ),
                                        child: isCompleted 
                                          ? const Icon(Icons.check, size: 14, color: Colors.white) 
                                          : null,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        statusSteps[stepIdx],
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                                          color: isCompleted ? AppTheme.primaryAction : AppTheme.textLight
                                        ),
                                      )
                                    ],
                                  );
                                } else {
                                  // Line
                                  int stepIdx = i ~/ 2;
                                  bool isCompletedLine = currentStepIndex != -1 && stepIdx < currentStepIndex;
                                  return Expanded(
                                    child: Container(
                                      height: 2,
                                      margin: const EdgeInsets.only(bottom: 20), // offset for text
                                      color: isCompletedLine ? AppTheme.primaryAction : Colors.grey.shade200,
                                    ),
                                  );
                                }
                              }),
                            ),
                          ),
    
                        // Items List
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: items.map((item) {
                              final qty = item['quantityKg'] ?? item['quantity'] ?? 0;
                              final name = item['name'] ?? 'Unknown Item';
                              final price = item['basePriceKg'] ?? item['price'] ?? 0;
                              final lineTotal = item['lineTotal'] ?? (qty * price);
                              
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12.0),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${qty}Kg × $name', 
                                        style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textDark)
                                      )
                                    ),
                                    Text(
                                      currencyFormat.format(lineTotal),
                                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textDark)
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
    
                        // Footer
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF9FAFB),
                            border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textLight, fontSize: 12)),
                                  const SizedBox(height: 2),
                                  Text(
                                    currencyFormat.format(total), 
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.primaryAction)
                                  ),
                                ],
                              ),
                              if (paymentStatus == 'Done' && invoiceNo != null)
                                OutlinedButton.icon(
                                  icon: const Icon(Icons.download, size: 16),
                                  label: const Text('Invoice'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.primaryAction,
                                    side: const BorderSide(color: AppTheme.primaryAction),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)
                                  ),
                                  onPressed: () async {
                                    final projectId = FirebaseFirestore.instance.app.options.projectId;
                                    final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/downloadInvoice?orderId=${doc.id}');
                                    try {
                                      await launchUrl(url, mode: LaunchMode.inAppBrowserView);
                                    } catch (e) {
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Could not open invoice')),
                                        );
                                      }
                                    }
                                  },
                                )
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
