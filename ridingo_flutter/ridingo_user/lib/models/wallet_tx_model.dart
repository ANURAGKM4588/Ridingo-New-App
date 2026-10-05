class WalletTxModel {
  final int ts;
  final String type;
  final int amount;
  final String title;
  final String sub;
  final String to;

  const WalletTxModel({
    required this.ts,
    required this.type,
    required this.amount,
    required this.title,
    required this.sub,
    required this.to,
  });

  factory WalletTxModel.fromJson(Map<String, dynamic> map) {
    return WalletTxModel(
      ts: (map['ts'] as num?)?.toInt() ?? 0,
      type: map['type'] ?? 'deposit',
      amount: (map['amount'] as num?)?.toInt() ?? 0,
      title: map['title'] ?? '',
      sub: map['sub'] ?? '',
      to: map['to'] ?? map['to_dest'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'ts': ts,
      'type': type,
      'amount': amount,
      'title': title,
      'sub': sub,
      'to_dest': to,
    };
  }
}
