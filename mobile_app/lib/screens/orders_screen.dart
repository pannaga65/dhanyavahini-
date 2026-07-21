import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final user = FirebaseAuth.instance.currentUser;
  final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

  // Status order map for the stepper
  final List<String> statusSteps = ['Inquiry', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

  @override
  Widget build(BuildContext context) {
    if (user == null) {
      return const Scaffold(body: Center(child: Text('Please log in')));
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Orders'),
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
                  Icon(Icons.receipt_long, size: 80, color: Colors.grey.withValues(alpha: 0.3)),
                  const SizedBox(height: 16),
                  const Text('No orders yet', style: TextStyle(fontSize: 18, color: AppTheme.textLight)),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final doc = orders[index];
              final data = doc.data() as Map<String, dynamic>;
              
              final status = data['status'] ?? 'Inquiry';
              final paymentStatus = data['paymentStatus'] ?? 'Pending';
              final invoiceNo = data['invoiceNo'];
              final total = data['totalAmount'] ?? data['total'] ?? 0;
              final items = (data['items'] as List<dynamic>?) ?? [];
              final dateStr = data['createdAt'] != null 
                  ? DateFormat('dd MMM yyyy, hh:mm a').format((data['createdAt'] as Timestamp).toDate()) 
                  : 'Unknown Date';

              int currentStepIndex = statusSteps.indexOf(status);
              if (currentStepIndex == -1) currentStepIndex = 0; // fallback
              if (status == 'Cancelled') currentStepIndex = -1;

              return Container(
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: AppTheme.softShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        border: Border(bottom: BorderSide(color: Color(0xFFF0F0F0))),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Order #ORD-${doc.id.substring(0, 6).toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 4),
                              Text(dateStr, style: const TextStyle(color: AppTheme.textLight, fontSize: 12)),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: status == 'Cancelled' ? Colors.red.withValues(alpha: 0.1) : AppTheme.secondaryAccent.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              status.toUpperCase(),
                              style: TextStyle(
                                color: status == 'Cancelled' ? Colors.red : AppTheme.secondaryAccent, 
                                fontWeight: FontWeight.bold, 
                                fontSize: 10
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    
                    // Tracking Stepper
                    if (status != 'Cancelled')
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Row(
                          children: List.generate(statusSteps.length * 2 - 1, (i) {
                            if (i % 2 == 0) {
                              // Node
                              int stepIdx = i ~/ 2;
                              bool isCompleted = stepIdx <= currentStepIndex;
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
                                  const SizedBox(height: 4),
                                  Text(
                                    statusSteps[stepIdx],
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                                      color: isCompleted ? AppTheme.primaryAction : AppTheme.textLight
                                    ),
                                  )
                                ],
                              );
                            } else {
                              // Line
                              int stepIdx = i ~/ 2;
                              bool isCompletedLine = stepIdx < currentStepIndex;
                              return Expanded(
                                child: Container(
                                  height: 2,
                                  margin: const EdgeInsets.only(bottom: 16), // offset text height
                                  color: isCompletedLine ? AppTheme.primaryAction : Colors.grey.shade200,
                                ),
                              );
                            }
                          }),
                        ),
                      ),

                    // Items
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: items.map((item) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('${item['quantityKg'] ?? item['quantity']} Kg x ${item['name']}'),
                                Text(currencyFormat.format(item['lineTotal'] ?? ((item['basePriceKg'] ?? item['price'] ?? 0) * (item['quantityKg'] ?? item['quantity'] ?? 0)))),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),

                    // Footer
                    Container(
                      margin: const EdgeInsets.only(top: 12),
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        color: Color(0xFFFAFAFA),
                        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.w600)),
                          Text(currencyFormat.format(total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryAction)),
                        ],
                      ),
                    ),

                    if (paymentStatus == 'Done' && invoiceNo != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.download, size: 18),
                          label: const Text('Download Invoice'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.primaryAction,
                            side: const BorderSide(color: AppTheme.primaryAction),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () async {
                            final projectId = FirebaseFirestore.instance.app.options.projectId;
                            final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/downloadInvoice?orderId=${doc.id}');
                            try {
                              await launchUrl(url, mode: LaunchMode.externalApplication);
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Could not open invoice')),
                                );
                              }
                            }
                          },
                        ),
                      )
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
