import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LiveBidScreen extends StatefulWidget {
  final String bidId;
  const LiveBidScreen({super.key, required this.bidId});

  @override
  State<LiveBidScreen> createState() => _LiveBidScreenState();
}

class _LiveBidScreenState extends State<LiveBidScreen> {
  final int basePrice = 6000;
  
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _volumeController = TextEditingController(text: "100");

  @override
  void initState() {
    super.initState();
    _priceController.text = basePrice.toString();
  }

  void _placeTender() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tender Submitted Successfully!')));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Live Session'),
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: AppTheme.softShadow,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
            ),
            child: Column(
              children: [
                const Text('Ends In', style: TextStyle(color: AppTheme.textLight)),
                const Text('14:32', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.red)),
                const SizedBox(height: 16),
                const Text('Reference Price', style: TextStyle(color: AppTheme.textLight)),
                Text('₹${basePrice.toString()}', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: AppTheme.primaryAction)),
                const SizedBox(height: 8),
                const Text('Submit your best proposed price and volume below.', style: TextStyle(color: AppTheme.textLight, fontSize: 12), textAlign: TextAlign.center,),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Your Proposed Tender', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _priceController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Price (₹ / Quintal)',
                      prefixText: '₹ ',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _volumeController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Volume Requested (Quintals)',
                      suffixText: 'Qtl',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: AppTheme.softShadow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: SafeArea(
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryAction,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _placeTender,
              child: const Text('Submit Tender securely', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ),
      ),
    );
  }
}
