import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);
    final markRead = ref.watch(markNotificationReadProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppTheme.surface,
        scrolledUnderElevation: 0,
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined, size: 64, color: AppTheme.textLight.withValues(alpha: 0.5)),
                  const SizedBox(height: 16),
                  const Text('No notifications yet!', style: TextStyle(color: AppTheme.textLight, fontSize: 16)),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final notif = notifications[index];
              final timeString = DateFormat('MMM d, h:mm a').format(notif.createdAt);

              return GestureDetector(
                onTap: () {
                  if (!notif.isRead) {
                    markRead(notif.id);
                  }
                },
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: notif.isRead ? AppTheme.surface : AppTheme.primaryAction.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: notif.isRead ? null : Border.all(color: AppTheme.primaryAction.withValues(alpha: 0.3)),
                    boxShadow: AppTheme.modernShadow,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: notif.isRead ? Colors.grey.shade100 : AppTheme.primaryAction.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            notif.isRead ? Icons.notifications_none : Icons.notifications_active,
                            color: notif.isRead ? AppTheme.textLight : AppTheme.primaryAction,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                notif.title,
                                style: TextStyle(
                                  fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.w800,
                                  fontSize: 15,
                                  color: AppTheme.textDark,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                notif.body,
                                style: TextStyle(
                                  color: notif.isRead ? AppTheme.textLight : AppTheme.textDark.withValues(alpha: 0.8),
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                timeString,
                                style: const TextStyle(
                                  color: AppTheme.textLight,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (!notif.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.secondaryAccent, // Amber dot for unread
                              shape: BoxShape.circle,
                            ),
                          )
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error loading notifications: $err')),
      ),
    );
  }
}
