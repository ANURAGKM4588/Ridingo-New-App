import Foundation
import UIKit
import Capacitor

@objc(UpiAppDetectorPlugin)
public class UpiAppDetectorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UpiAppDetectorPlugin"
    public let jsName = "UpiAppDetector"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getInstalledUpiApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkInstalledApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "canOpenUrl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openUrl", returnType: CAPPluginReturnPromise)
    ]

    private struct UpiAppCandidate {
        let id: String
        let scheme: String
        let appName: String
        let packageName: String
    }

    private let upiApps: [UpiAppCandidate] = [
        UpiAppCandidate(id: "gpay", scheme: "tez", appName: "Google Pay", packageName: "com.google.android.apps.nbu.paisa.user"),
        UpiAppCandidate(id: "phonepe", scheme: "phonepe", appName: "PhonePe", packageName: "com.phonepe.app"),
        UpiAppCandidate(id: "navi", scheme: "navi", appName: "Navi UPI", packageName: "com.naviapp"),
        UpiAppCandidate(id: "cred", scheme: "credpay", appName: "CRED", packageName: "com.dreamplug.androidapp"),
        UpiAppCandidate(id: "supermoney", scheme: "supermoney", appName: "super.money", packageName: "money.super.app"),
        UpiAppCandidate(id: "jupiter", scheme: "jupiter", appName: "Jupiter", packageName: "money.jupiter"),
        UpiAppCandidate(id: "paytm", scheme: "paytmmp", appName: "Paytm", packageName: "net.one97.paytm"),
        UpiAppCandidate(id: "bhim", scheme: "bhim", appName: "BHIM UPI", packageName: "in.org.npci.upiapp"),
        UpiAppCandidate(id: "amazonpay", scheme: "amazonpay", appName: "Amazon Pay", packageName: "in.amazon.mShop.android.shopping")
    ]

    @objc func getInstalledUpiApps(_ call: CAPPluginCall) {
        detectInstalledApps(call)
    }

    @objc func checkInstalledApps(_ call: CAPPluginCall) {
        detectInstalledApps(call)
    }

    private func detectInstalledApps(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["apps": [], "installedApps": [], "schemes": [], "count": 0])
                return
            }

            var detectedApps: [[String: Any]] = []
            var detectedSchemes: [String] = []

            for app in self.upiApps {
                let candidateUrlStrings = [
                    "\(app.scheme)://",
                    "\(app.scheme)://pay",
                    "\(app.scheme)://upi/pay"
                ]

                var isInstalled = false
                for urlStr in candidateUrlStrings {
                    if let url = URL(string: urlStr), UIApplication.shared.canOpenURL(url) {
                        isInstalled = true
                        break
                    }
                }

                if isInstalled {
                    detectedSchemes.append(app.scheme)
                    detectedApps.append([
                        "id": app.id,
                        "scheme": app.scheme,
                        "appName": app.appName,
                        "name": app.appName,
                        "packageName": app.packageName
                    ])
                }
            }

            call.resolve([
                "apps": detectedApps,
                "installedApps": detectedApps,
                "schemes": detectedSchemes,
                "count": detectedApps.count
            ])
        }
    }

    @objc func canOpenUrl(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.resolve(["value": false])
            return
        }

        DispatchQueue.main.async {
            let canOpen = UIApplication.shared.canOpenURL(url)
            call.resolve(["value": canOpen])
        }
    }

    @objc func openUrl(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.resolve(["completed": false])
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { success in
                call.resolve(["completed": success])
            }
        }
    }
}
