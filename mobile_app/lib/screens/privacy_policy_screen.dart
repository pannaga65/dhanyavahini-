import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Privacy Policy', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text(
              'Welcome to Dhanyavahini. We respect your privacy and want to protect your personal information.\n\n'
              '1. Information We Collect\n'
              'We collect information you provide directly to us, such as when you create or modify your account, contact customer support, or place an order.\n\n'
              '2. How We Use Information\n'
              'We may use the information we collect to provide, maintain, and improve our services, and process your transactions.\n\n'
              '3. Sharing of Information\n'
              'We do not share your personal information with third parties except as described in this privacy policy.\n\n'
              '(This is a placeholder for your actual Privacy Policy. You can update this text later.)',
              style: TextStyle(fontSize: 16, height: 1.5),
            )
          ],
        ),
      ),
    );
  }
}
