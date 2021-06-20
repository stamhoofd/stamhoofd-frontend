//
//  HomeViewController.swift
//  App
//
//  Created by Simon Backx on 19/06/2021.
//

import Foundation
import UIKit
import Capacitor

/**
    We enable the default swipe to go back behaviour in the WKWebView
 */
class HomeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        self.webView!.allowsBackForwardNavigationGestures = true
        self.webView!.scrollView.bounces = true
        self.webView!.allowsLinkPreview = false
        self.webView!.scrollView.keyboardDismissMode = .interactive
    }
}