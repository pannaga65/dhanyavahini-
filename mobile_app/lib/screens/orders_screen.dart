import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:flutter_html_to_pdf/flutter_html_to_pdf.dart';
import 'package:open_filex/open_filex.dart';
import 'package:cached_network_image/cached_network_image.dart';
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
  
  String _selectedFilter = 'All';
  final Set<String> _expandedOrders = {};

  final List<String> statusSteps = ['Order Placed', 'Confirmed', 'Dispatched', 'Delivered'];
  final List<String> filterOptions = ['All', 'Active', 'Delivered', 'Cancelled'];

  String _normalizeStatus(String rawStatus) {
    if (rawStatus.isEmpty) return 'Order Placed';
    final s = rawStatus.toLowerCase();
    if (s == 'inquiry' || s == 'pending') return 'Order Placed';
    if (s == 'confirmed') return 'Confirmed';
    if (s == 'dispatched' || s == 'shipped' || s == 'processing') return 'Dispatched';
    if (s == 'delivered') return 'Delivered';
    if (s == 'rejected' || s == 'cancelled') return 'Cancelled';
    return rawStatus[0].toUpperCase() + rawStatus.substring(1);
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Order Placed': return Colors.blue;
      case 'Confirmed': return AppTheme.primaryAction;
      case 'Dispatched': return Colors.orange;
      case 'Delivered': return AppTheme.secondaryAccent;
      case 'Cancelled': return Colors.red;
      default: return Colors.grey;
    }
  }

  bool _matchesFilter(String status) {
    if (_selectedFilter == 'All') return true;
    if (_selectedFilter == 'Active' && status != 'Delivered' && status != 'Cancelled') return true;
    if (_selectedFilter == 'Delivered' && status == 'Delivered') return true;
    if (_selectedFilter == 'Cancelled' && status == 'Cancelled') return true;
    return false;
  }

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
      body: Column(
        children: [
          const SizedBox(height: 100), // Spacing for AppBar
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: filterOptions.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(filter, style: TextStyle(
                      color: isSelected ? Colors.white : AppTheme.textLight,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    )),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedFilter = filter);
                    },
                    selectedColor: AppTheme.primaryAction,
                    backgroundColor: Colors.white,
                    side: BorderSide(color: isSelected ? AppTheme.primaryAction : Colors.grey.shade300),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                );
              }).toList(),
            ),
          ),
          
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
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

                final allOrders = snapshot.data?.docs ?? [];
                
                // Client-side filter
                final orders = allOrders.where((doc) {
                  final data = doc.data() as Map<String, dynamic>;
                  return _matchesFilter(_normalizeStatus(data['status'] ?? 'Inquiry'));
                }).toList();

                if (orders.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long, size: 80, color: AppTheme.textLight.withValues(alpha: 0.3)),
                        const SizedBox(height: 16),
                        const Text('No orders found', style: TextStyle(fontSize: 18, color: AppTheme.textLight, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.only(top: 8, left: 16, right: 16, bottom: 40),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    final doc = orders[index];
                    final data = doc.data() as Map<String, dynamic>;
                    
                    final status = _normalizeStatus(data['status'] ?? 'Inquiry');
                    final paymentStatus = data['paymentStatus'] ?? 'Pending';
                    final invoiceNo = data['invoiceNo'];
                    final total = data['totalAmount'] ?? data['total'] ?? 0.0;
                    final items = (data['items'] as List<dynamic>?) ?? [];
                    final isExpanded = _expandedOrders.contains(doc.id);
                    
                    final dateStr = data['createdAt'] != null 
                        ? DateFormat('dd MMM yyyy').format((data['createdAt'] as Timestamp).toDate()) 
                        : 'Unknown Date';

                    final isCancelled = status == 'Cancelled';
                    final statusColor = _getStatusColor(status);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: BouncyCard(
                        onTap: () {
                          setState(() {
                            if (isExpanded) _expandedOrders.remove(doc.id);
                            else _expandedOrders.add(doc.id);
                          });
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: AppTheme.modernShadow,
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Compact Header
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Container(
                                                width: 8, height: 8,
                                                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                                              ),
                                              const SizedBox(width: 8),
                                              Text(status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 13)),
                                              const SizedBox(width: 8),
                                              Text(dateStr, style: const TextStyle(color: AppTheme.textLight, fontSize: 12)),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          // Show compact items preview
                                          if (!isExpanded)
                                            ...items.take(2).map((item) {
                                              return Padding(
                                                padding: const EdgeInsets.only(bottom: 4),
                                                child: Row(
                                                  children: [
                                                    if (item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty)
                                                      Container(
                                                        width: 24, height: 24,
                                                        margin: const EdgeInsets.only(right: 8),
                                                        decoration: BoxDecoration(
                                                          color: Colors.grey.shade100,
                                                          borderRadius: BorderRadius.circular(4),
                                                          image: DecorationImage(image: CachedNetworkImageProvider(item['imageUrl']), fit: BoxFit.cover)
                                                        ),
                                                      )
                                                    else
                                                      Container(
                                                        width: 24, height: 24,
                                                        margin: const EdgeInsets.only(right: 8),
                                                        decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(4)),
                                                        child: const Icon(Icons.inventory_2, size: 14, color: Colors.grey),
                                                      ),
                                                    Expanded(
                                                      child: Text('${item['quantityKg'] ?? item['quantity']}Kg × ${item['name']}', 
                                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                                                        maxLines: 1, overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              );
                                            }),
                                          if (!isExpanded && items.length > 2)
                                            Padding(
                                              padding: const EdgeInsets.only(left: 32, top: 4),
                                              child: Text('+ ${items.length - 2} more items', style: const TextStyle(color: AppTheme.textLight, fontSize: 12, fontWeight: FontWeight.w600)),
                                            ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(currencyFormat.format(total), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                        const SizedBox(height: 8),
                                        Icon(isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: AppTheme.textLight),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              
                              // Expanded Content
                              if (isExpanded) ...[
                                const Divider(height: 1),
                                
                                // Tracking Stepper
                                if (!isCancelled)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                                    child: Row(
                                      children: List.generate(statusSteps.length * 2 - 1, (i) {
                                        if (i % 2 == 0) {
                                          int stepIdx = i ~/ 2;
                                          bool isCompleted = statusSteps.indexOf(status) != -1 && stepIdx <= statusSteps.indexOf(status);
                                          bool isCurrent = stepIdx == statusSteps.indexOf(status);
                                          
                                          return Column(
                                            children: [
                                              Container(
                                                width: 24,
                                                height: 24,
                                                decoration: BoxDecoration(
                                                  color: isCompleted ? AppTheme.primaryAction : AppTheme.background,
                                                  shape: BoxShape.circle,
                                                  border: Border.all(color: isCompleted ? AppTheme.primaryAction : Colors.grey.shade300, width: 2),
                                                ),
                                                child: isCompleted ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
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
                                          int stepIdx = i ~/ 2;
                                          bool isCompletedLine = statusSteps.indexOf(status) != -1 && stepIdx < statusSteps.indexOf(status);
                                          return Expanded(
                                            child: Container(
                                              height: 2,
                                              margin: const EdgeInsets.only(bottom: 20),
                                              color: isCompletedLine ? AppTheme.primaryAction : Colors.grey.shade200,
                                            ),
                                          );
                                        }
                                      }),
                                    ),
                                  ),
            
                                // Full Items List
                                Container(
                                  color: Colors.grey.shade50,
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
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
                                            if (item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty)
                                              Container(
                                                width: 40, height: 40,
                                                margin: const EdgeInsets.only(right: 12),
                                                decoration: BoxDecoration(
                                                  color: Colors.white,
                                                  borderRadius: BorderRadius.circular(8),
                                                  image: DecorationImage(image: CachedNetworkImageProvider(item['imageUrl']), fit: BoxFit.cover)
                                                ),
                                              )
                                            else
                                              Container(
                                                width: 40, height: 40,
                                                margin: const EdgeInsets.only(right: 12),
                                                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                                                child: const Icon(Icons.inventory_2, size: 20, color: Colors.grey),
                                              ),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                                  Text('${qty}Kg × ₹$price', style: const TextStyle(color: AppTheme.textLight, fontSize: 12)),
                                                ],
                                              )
                                            ),
                                            Text(currencyFormat.format(lineTotal), style: const TextStyle(fontWeight: FontWeight.w700)),
                                          ],
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
            
                                // Footer with actions
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: const BoxDecoration(
                                    border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Order ID: ${doc.id.substring(0, 8).toUpperCase()}', style: const TextStyle(color: AppTheme.textLight, fontSize: 11)),
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
                                            if (context.mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('Downloading invoice...'), duration: Duration(seconds: 2)),
                                              );
                                            }
                                            final projectId = FirebaseFirestore.instance.app.options.projectId;
                                            final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/downloadInvoice?orderId=${doc.id}&noJs=true');
                                            try {
                                              final response = await http.get(url);
                                              if (response.statusCode == 200) {
                                                final appDocDir = await getApplicationDocumentsDirectory();
                                                final targetPath = appDocDir.path;
                                                final targetFileName = 'Invoice_${doc.id}';
                                                
                                                final generatedPdfFile = await FlutterHtmlToPdf.convertFromHtmlContent(
                                                  response.body,
                                                  targetPath,
                                                  targetFileName,
                                                );
                                                
                                                await OpenFilex.open(generatedPdfFile.path);
                                              } else {
                                                throw Exception('Failed to load invoice HTML');
                                              }
                                            } catch (e) {
                                              if (context.mounted) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  SnackBar(content: Text('Could not open invoice: $e')),
                                                );
                                              }
                                            }
                                          },
                                        )
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

