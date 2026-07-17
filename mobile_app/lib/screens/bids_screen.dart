import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

class BidsScreen extends StatelessWidget {
  const BidsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Live Bidding'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: 2, // Mock active bids
        itemBuilder: (context, index) {
          return GestureDetector(
            onTap: () => context.push('/live_bid/bid_${index + 1}'),
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: AppTheme.softShadow,
                border: Border.all(color: AppTheme.primaryAction.withOpacity(0.3), width: 2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryAction.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.circle, color: AppTheme.primaryAction, size: 10),
                            SizedBox(width: 6),
                            Text('LIVE NOW', style: TextStyle(color: AppTheme.primaryAction, fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                      ),
                      const Text('Ends in 14:32', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('Premium Chana Dal (Export Quality)', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Base Price', style: TextStyle(color: AppTheme.textLight)),
                          const Text('₹6,000 / Qtl', style: TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Current Highest', style: TextStyle(color: AppTheme.textLight)),
                          Text('₹6,150 / Qtl', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryAction)),
                        ],
                      ),
                    ],
                  )
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
