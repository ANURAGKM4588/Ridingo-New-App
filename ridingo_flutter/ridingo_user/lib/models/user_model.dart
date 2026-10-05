class UserModel {
  final String name;
  final String phone;
  final String email;
  final String? avatar;
  final Map<String, dynamic> car;
  final bool notif;
  final bool pin;
  final String pinCode;
  final bool liveShare;
  final bool quiet;
  final String acTemp;
  final String acMode;
  final bool acPrecool;
  final List<Map<String, String>> sosContacts;
  final String insuranceTier;
  final Map<String, String> nominee;
  final List<String> languages;
  final bool quietCabin;
  final bool maskNumber;
  final bool locPrivacy;

  const UserModel({
    required this.name,
    required this.phone,
    required this.email,
    this.avatar,
    this.car = const {'model': 'Hyundai Creta', 'plate': 'KL 07 AB 4821', 'trans': 'Automatic'},
    this.notif = true,
    this.pin = true,
    this.pinCode = '4821',
    this.liveShare = true,
    this.quiet = false,
    this.acTemp = '22°C',
    this.acMode = 'Chill',
    this.acPrecool = true,
    this.sosContacts = const [
      {'name': 'Priya Menon', 'relation': 'Spouse', 'phone': '+91 98401 23456'}
    ],
    this.insuranceTier = 'standard',
    this.nominee = const {'name': 'Priya Menon', 'relation': 'Spouse'},
    this.languages = const ['English', 'Hindi', 'Malayalam'],
    this.quietCabin = true,
    this.maskNumber = true,
    this.locPrivacy = true,
  });

  UserModel copyWith({
    String? name,
    String? phone,
    String? email,
    String? avatar,
    Map<String, dynamic>? car,
    bool? notif,
    bool? pin,
    String? pinCode,
    bool? liveShare,
    bool? quiet,
    String? acTemp,
    String? acMode,
    bool? acPrecool,
    List<Map<String, String>>? sosContacts,
    String? insuranceTier,
    Map<String, String>? nominee,
    List<String>? languages,
    bool? quietCabin,
    bool? maskNumber,
    bool? locPrivacy,
  }) {
    return UserModel(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      avatar: avatar ?? this.avatar,
      car: car ?? this.car,
      notif: notif ?? this.notif,
      pin: pin ?? this.pin,
      pinCode: pinCode ?? this.pinCode,
      liveShare: liveShare ?? this.liveShare,
      quiet: quiet ?? this.quiet,
      acTemp: acTemp ?? this.acTemp,
      acMode: acMode ?? this.acMode,
      acPrecool: acPrecool ?? this.acPrecool,
      sosContacts: sosContacts ?? this.sosContacts,
      insuranceTier: insuranceTier ?? this.insuranceTier,
      nominee: nominee ?? this.nominee,
      languages: languages ?? this.languages,
      quietCabin: quietCabin ?? this.quietCabin,
      maskNumber: maskNumber ?? this.maskNumber,
      locPrivacy: locPrivacy ?? this.locPrivacy,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'email': email,
      'avatar': avatar,
      'car': car,
      'notif': notif,
      'pin': pin,
      'pinCode': pinCode,
      'liveShare': liveShare,
      'quiet': quiet,
      'acTemp': acTemp,
      'acMode': acMode,
      'acPrecool': acPrecool,
      'sosContacts': sosContacts,
      'insuranceTier': insuranceTier,
      'nominee': nominee,
      'languages': languages,
      'quietCabin': quietCabin,
      'maskNumber': maskNumber,
      'locPrivacy': locPrivacy,
    };
  }

  factory UserModel.fromJson(Map<String, dynamic> map) {
    return UserModel(
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      email: map['email'] ?? '',
      avatar: map['avatar'],
      car: map['car'] != null ? Map<String, dynamic>.from(map['car']) : const {'model': 'Hyundai Creta', 'plate': 'KL 07 AB 4821'},
      notif: map['notif'] ?? true,
      pin: map['pin'] ?? true,
      pinCode: map['pinCode'] ?? '4821',
      liveShare: map['liveShare'] ?? true,
      quiet: map['quiet'] ?? false,
      acTemp: map['acTemp'] ?? '22°C',
      acMode: map['acMode'] ?? 'Chill',
      acPrecool: map['acPrecool'] ?? true,
      sosContacts: map['sosContacts'] != null
          ? List<Map<String, String>>.from((map['sosContacts'] as List).map((x) => Map<String, String>.from(x)))
          : const [],
      insuranceTier: map['insuranceTier'] ?? 'standard',
      nominee: map['nominee'] != null ? Map<String, String>.from(map['nominee']) : const {},
      languages: map['languages'] != null ? List<String>.from(map['languages']) : const ['English'],
      quietCabin: map['quietCabin'] ?? true,
      maskNumber: map['maskNumber'] ?? true,
      locPrivacy: map['locPrivacy'] ?? true,
    );
  }
}
