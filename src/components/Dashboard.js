import React, { useState, useEffect } from 'react';
import { 
  Activity, Wifi, WifiOff, Settings, Send, RefreshCw, 
  Satellite, Box, MapPin, FileText, Database, Sun, Moon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LiquidLevel3D from './LiquidLevel3D';
import Rocket3D from './Rocket3D';
import Payload3D from './Payload3D';
import GoogleMap from './GoogleMap';

const Dashboard = () => {
  // ---------------------------------------------------------
  // 1. STATE VE APİ FONKSİYONLARI
  // ---------------------------------------------------------
  const [isDarkMode, setIsDarkMode] = useState(true); // Default Dark Mode
  const [isConnected, setIsConnected] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [config, setConfig] = useState({
    teamId: '68',
    loraPort: 'none',
    payloadGpsPort: 'none',
    hyiPort: 'none'
  });
  
  const [telemetryData, setTelemetryData] = useState({
    altitude: 0.0, max_altitude: 0.0, gps_altitude: 0.0, delta_y: 0.0,
    fired: false, p1: false, p2: false, gyro_x: 0.0, gyro_y: 0.0, gyro_z: 0.0,
    accel_x: 0.00, accel_y: 0.00, accel_z: 0.00, pitch: 0.0,
    gps_latitude: 0.0, gps_longitude: 0.0, gps_valid: false,
    payload_gps_altitude: 0.0, payload_latitude: 0.0, payload_longitude: 0.0,
    payload_gps_valid: false, payload_gyro_x: 0.0, payload_gyro_y: 0.0, payload_gyro_z: 0.0,
    last_update: null, packet_count: 0, payload_last_update: null, payload_packet_count: 0,
    all_liquid_data: "", liquid_levels: new Array(24).fill(0)
  });
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    lora: false, payload_gps: false, hyi: false
  });

  const [activeTab, setActiveTab] = useState('kontrol');
  const API_BASE = 'http://localhost:8000/api';

  const loadAvailablePorts = async () => {
    try {
      const response = await fetch(`${API_BASE}/ports`);
      const data = await response.json();
      if (data.success) {
        setAvailablePorts(data.ports);
        if (data.ports.length > 0) {
          setConfig(prev => ({
            ...prev,
            loraPort: data.ports[0]?.port || 'none',
            payloadGpsPort: 'none',
            hyiPort: 'none'
          }));
        }
      }
    } catch (error) {
      console.error('Port listesi alınamadı:', error);
      addLog('❌ Port listesi alınamadı');
    }
  };

  const fetchTelemetry = async () => {
    try {
      const response = await fetch(`${API_BASE}/telemetry`);
      const data = await response.json();
      if (data.success) setTelemetryData(data.data);
    } catch (error) { console.error('Telemetri alınamadı:', error); }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/logs`);
      const data = await response.json();
      if (data.success && data.logs.length > 0) {
        setLogs(prev => [...prev, ...data.logs].slice(-50));
      }
    } catch (error) { console.error('Log alınamadı:', error); }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), { timestamp, message, id: Date.now() }]);
  };

  const checkSystemStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/../health`);
      const data = await response.json();
      if (data.status === 'healthy') {
        setIsConnected(data.running);
        setConnectionStatus(data.connected);
        if (data.telemetry) setTelemetryData(data.telemetry);
      }
    } catch (error) { console.error('Sistem durumu alınamadı:', error); }
  };

  useEffect(() => {
    loadAvailablePorts();
    checkSystemStatus();
    const telemetryInterval = setInterval(fetchTelemetry, 500);
    const logInterval = setInterval(fetchLogs, 1000);
    const statusInterval = setInterval(checkSystemStatus, 5000);
    return () => {
      clearInterval(telemetryInterval);
      clearInterval(logInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const handleConnect = async () => {
    if (!config.loraPort && !config.payloadGpsPort && !config.hyiPort) {
      addLog('❌ En az bir port seçilmelidir'); return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/connect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: parseInt(config.teamId), loraPort: config.loraPort || 'none',
          payloadGpsPort: config.payloadGpsPort || 'none', hyiPort: config.hyiPort || 'none', autoSend: autoSend
        }),
      });
      const data = await response.json();
      if (data.success) { setIsConnected(true); addLog(`🔌 ${data.message}`); }
      else { addLog(`❌ ${data.message || data.error}`); }
    } catch (error) { addLog(`❌ Bağlantı hatası: ${error.message}`); }
    finally { setLoading(false); }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/disconnect`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setIsConnected(false);
        setConnectionStatus({ lora: false, payload_gps: false, hyi: false });
        addLog(`✅ ${data.message}`);
      } else { addLog(`❌ ${data.message || data.error}`); }
    } catch (error) { addLog(`❌ Bağlantı kesme hatası: ${error.message}`); }
    finally { setLoading(false); }
  };
  
  const toggleAutoSend = async (enabled) => {
    try {
      const response = await fetch(`${API_BASE}/auto-send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      if (data.success) { setAutoSend(enabled); addLog(`⚙️ ${data.message}`); }
      else { addLog(`❌ ${data.message || data.error}`); }
    } catch (error) { addLog(`❌ Otomatik gönderim hatası: ${error.message}`); }
  };

  const sendManualPacket = async () => {
    try {
      const response = await fetch(`${API_BASE}/send-packet`, { method: 'POST' });
      const data = await response.json();
      if (data.success) { addLog(`📤 ${data.message}`); }
      else { addLog(`❌ ${data.message || data.error}`); }
    } catch (error) { addLog(`❌ Manuel gönderim hatası: ${error.message}`); }
  };
  
  const exportData = async () => {
    try {
      const response = await fetch(`${API_BASE}/export`, { method: 'GET' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `telemetry_data_${new Date().toISOString()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        addLog('📥 Veriler dışarı aktarıldı');
      } else {
        const errorData = await response.json();
        addLog(`❌ Dışarı aktarma hatası: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) { addLog(`❌ Dışarı aktarma hatası: ${error.message}`); }
  };

  const theme = {
    bg: isDarkMode ? "bg-[#0B1120]" : "bg-gray-50",
    header: isDarkMode ? "bg-[#111827] border-gray-800" : "bg-white border-gray-200",
    card: isDarkMode ? "bg-[#111827] border-gray-800 shadow-lg" : "bg-white border-gray-200 shadow-sm",
    text: isDarkMode ? "text-gray-100" : "text-gray-900",
    textMuted: isDarkMode ? "text-gray-400" : "text-gray-600",
    border: isDarkMode ? "border-gray-800" : "border-gray-200",
    input: isDarkMode ? "bg-[#1F2937] border-gray-700 text-gray-200" : "bg-gray-50 border-gray-300 text-gray-900",
    
    // Tab Butonları
    tabActive: isDarkMode ? "border-blue-500 text-blue-400 bg-blue-900/20" : "border-blue-600 text-blue-600 bg-blue-50/50",
    tabInactive: isDarkMode ? "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",

    // Renkli Veri Kartları (Grid İçin)
    blueCard: isDarkMode ? "bg-blue-900/20 border-blue-800/50" : "bg-blue-50 border-blue-100",
    greenCard: isDarkMode ? "bg-green-900/20 border-green-800/50" : "bg-green-50 border-green-100",
    purpleCard: isDarkMode ? "bg-purple-900/20 border-purple-800/50" : "bg-purple-50 border-purple-100",
    redCard: isDarkMode ? "bg-red-900/20 border-red-800/50" : "bg-red-50 border-red-100",
    orangeCard: isDarkMode ? "bg-orange-900/20 border-orange-800/50" : "bg-orange-50 border-orange-100",
    yellowCard: isDarkMode ? "bg-yellow-900/20 border-yellow-800/50" : "bg-yellow-50 border-yellow-100",
    cyanCard: isDarkMode ? "bg-cyan-900/20 border-cyan-800/50" : "bg-cyan-50 border-cyan-100",
    grayCard: isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200",

    // Renkli Metinler
    blueText: isDarkMode ? "text-blue-400" : "text-blue-600",
    greenText: isDarkMode ? "text-green-400" : "text-green-600",
    purpleText: isDarkMode ? "text-purple-400" : "text-purple-600",
    redText: isDarkMode ? "text-red-400" : "text-red-600",
    orangeText: isDarkMode ? "text-orange-400" : "text-orange-600",
    yellowText: isDarkMode ? "text-yellow-400" : "text-yellow-600",
    cyanText: isDarkMode ? "text-cyan-400" : "text-cyan-600",
  };

  const tabs = [
    { id: 'kontrol', label: 'Kontrol Merkezi', icon: Settings },
    { id: 'telemetri', label: 'Telemetri', icon: Database },
    { id: 'modeller', label: '3D Modeller', icon: Box },
    { id: 'harita', label: 'Harita ve GPS', icon: MapPin },
    { id: 'loglar', label: 'Sistem Logları', icon: FileText }
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme.bg}`}>
      
      {/* Header: */}
      <div className={`shadow-sm border-b sticky top-0 z-50 transition-colors duration-300 ${theme.header}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className={`h-8 w-8 ${theme.blueText}`} />
              <div>
                <h1 className={`text-2xl font-bold ${theme.text}`}>TOBB ETU TEKNOFEST GROUND STATION</h1>
                <p className={`text-sm ${theme.textMuted}`}>Dual Port Interface Dashboard v2.1</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              
              {/* Dark mode butonu */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition border ${
                  isDarkMode 
                    ? 'bg-gray-800 text-yellow-400 border-gray-700 hover:bg-gray-700' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                title="Tema Değiştir"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="font-medium hidden sm:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* Portları Yenile */}
              <button 
                onClick={loadAvailablePorts} 
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition border ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                title="Portları Yenile"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="font-medium hidden sm:inline">Portları Yenile</span>
              </button>
              
              {/* Sistem Durumu */}
              {isConnected ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/10 rounded-md border border-green-500/20">
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-green-500 font-medium text-sm">Sistem Aktif</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/10 rounded-md border border-red-500/20">
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 font-medium text-sm">Sistem Kapalı</span>
                </div>
              )}

            </div>
          </div>
        </div>
        
        {/* Sekme Menüsü */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-all duration-200 font-medium ${
                    activeTab === tab.id ? theme.tabActive : theme.tabInactive
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Slidable surface */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* Kontrol Merkezi */}
            {activeTab === 'kontrol' && (
              <div className="space-y-6">
                
                {/* Aktif Bağlantı Durumu */}
                {isConnected && (
                  <div className={`rounded-lg p-4 border transition-colors ${theme.card}`}>
                    <h3 className={`text-sm font-medium mb-3 ${theme.textMuted}`}>Bağlantı Durumu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border ${connectionStatus.lora ? theme.greenCard : theme.grayCard}`}>
                        <Activity className={`h-4 w-4 ${connectionStatus.lora ? theme.greenText : theme.textMuted}`} />
                        <span className={`text-sm font-medium ${connectionStatus.lora ? theme.greenText : theme.textMuted}`}>
                          LoRa: {connectionStatus.lora ? 'Bağlı' : 'Devre Dışı'}
                        </span>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border ${connectionStatus.payload_gps ? theme.greenCard : theme.grayCard}`}>
                        <Satellite className={`h-4 w-4 ${connectionStatus.payload_gps ? theme.greenText : theme.textMuted}`} />
                        <span className={`text-sm font-medium ${connectionStatus.payload_gps ? theme.greenText : theme.textMuted}`}>
                          Payload GPS: {connectionStatus.payload_gps ? 'Bağlı' : 'Devre Dışı'}
                        </span>
                      </div>
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border ${connectionStatus.hyi ? theme.greenCard : theme.grayCard}`}>
                        <Send className={`h-4 w-4 ${connectionStatus.hyi ? theme.greenText : theme.textMuted}`} />
                        <span className={`text-sm font-medium ${connectionStatus.hyi ? theme.greenText : theme.textMuted}`}>
                          HYİ: {connectionStatus.hyi ? 'Bağlı' : 'Devre Dışı'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ayarlar Paneli */}
                <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                  <div className={`flex items-center space-x-2 mb-6 pb-4 border-b ${theme.border}`}>
                    <Settings className={`h-5 w-5 ${theme.textMuted}`} />
                    <h2 className={`text-lg font-semibold ${theme.text}`}>Sistem Ayarları</h2>
                  </div>
                  
                  {/* Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Takım ID</label>
                      <input 
                        type="number" 
                        value={config.teamId} 
                        className={`w-full px-3 py-2 rounded-md border focus:outline-none ${theme.input} opacity-70`} 
                        disabled 
                        readOnly 
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>LoRa Port (Roket)</label>
                      <select 
                        value={config.loraPort} 
                        onChange={(e) => setConfig(prev => ({...prev, loraPort: e.target.value}))} 
                        className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.input}`} 
                        disabled={isConnected}
                      >
                        <option value="">Port Seçin</option>
                        <option value="none">Yok / Devre Dışı</option>
                        {availablePorts.map((port) => (
                          <option key={port.port} value={port.port}>{port.port} - {port.description}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Payload GPS Port</label>
                      <select 
                        value={config.payloadGpsPort} 
                        onChange={(e) => setConfig(prev => ({...prev, payloadGpsPort: e.target.value}))} 
                        className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.input}`} 
                        disabled={isConnected}
                      >
                        <option value="none">Yok / Devre Dışı</option>
                        {availablePorts.map((port) => (
                          <option key={port.port} value={port.port}>{port.port} - {port.description}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>HYİ Port</label>
                      <select 
                        value={config.hyiPort} 
                        onChange={(e) => setConfig(prev => ({...prev, hyiPort: e.target.value}))} 
                        className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.input}`} 
                        disabled={isConnected}
                      >
                        <option value="">Port Seçin</option>
                        <option value="none">Yok / Devre Dışı</option>
                        {availablePorts.map((port) => (
                          <option key={port.port} value={port.port}>{port.port} - {port.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Alt Kontrol Paneli*/}
                  <div className={`flex flex-col sm:flex-row items-center justify-between pt-6 border-t ${theme.border} gap-4`}>
                    
                    {/* Checkbox */}
                    <label className="flex items-center space-x-2 cursor-pointer w-full sm:w-auto">
                      <input 
                        type="checkbox" 
                        checked={autoSend} 
                        onChange={(e) => toggleAutoSend(e.target.checked)} 
                        className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500" 
                        disabled={!isConnected} 
                      />
                      <span className={`text-sm font-medium ${theme.text}`}>Otomatik HYİ Gönderimi</span>
                    </label>

                    {/* Aksiyon Butonları */}
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {!isConnected ? (
                        <button 
                          onClick={handleConnect} 
                          disabled={loading || (!config.loraPort && !config.payloadGpsPort && !config.hyiPort)} 
                          className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                          <span>Bağlan</span>
                        </button>
                      ) : (
                        <button 
                          onClick={handleDisconnect} 
                          disabled={loading} 
                          className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                          <span>Bağlantıyı Kes</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={sendManualPacket} 
                        disabled={!isConnected} 
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        <span>Manuel Gönder</span>
                      </button>
                      
                      <button 
                        onClick={exportData} 
                        disabled={!isConnected} 
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Dışarı Aktar</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Veri Kaynak Durumu Paneli */}
                <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                  <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Veri Kaynak Durumu</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`border rounded-lg p-4 transition-colors ${theme.grayCard}`}>
                      <div className="flex items-center space-x-2 mb-3">
                        <Activity className={`h-5 w-5 ${theme.blueText}`} />
                        <h3 className={`font-medium ${theme.text}`}>LoRa (Roket Verisi)</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${connectionStatus.lora ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {connectionStatus.lora ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p><span className={theme.textMuted}>Port:</span> <span className={`font-medium ${theme.text}`}>{config.loraPort || 'Seçilmedi'}</span></p>
                        <p><span className={theme.textMuted}>Son Paket:</span> <span className={`font-medium ${theme.text}`}>{telemetryData.last_update || 'Henüz veri yok'}</span></p>
                        <p><span className={theme.textMuted}>Toplam Paket:</span> <span className={`font-medium ${theme.text}`}>{telemetryData.packet_count}</span></p>
                        <p><span className={theme.textMuted}>GPS Durumu:</span> <span className={`font-medium ${telemetryData.gps_valid ? theme.greenText : theme.redText}`}>{telemetryData.gps_valid ? 'Geçerli' : 'Geçersiz'}</span></p>
                      </div>
                    </div>

                    <div className={`border rounded-lg p-4 transition-colors ${theme.grayCard}`}>
                      <div className="flex items-center space-x-2 mb-3">
                        <Satellite className={`h-5 w-5 ${theme.cyanText}`} />
                        <h3 className={`font-medium ${theme.text}`}>Payload GPS</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${connectionStatus.payload_gps ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>
                          {connectionStatus.payload_gps ? 'Aktif' : config.payloadGpsPort === 'none' ? 'Devre Dışı' : 'Pasif'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p><span className={theme.textMuted}>Port:</span> <span className={`font-medium ${theme.text}`}>{config.payloadGpsPort === 'none' ? 'Devre Dışı' : config.payloadGpsPort || 'Seçilmedi'}</span></p>
                        <p><span className={theme.textMuted}>Son Paket:</span> <span className={`font-medium ${theme.text}`}>{telemetryData.payload_last_update || 'Henüz veri yok'}</span></p>
                        <p><span className={theme.textMuted}>Toplam Paket:</span> <span className={`font-medium ${theme.text}`}>{telemetryData.payload_packet_count || 0}</span></p>
                        <p><span className={theme.textMuted}>GPS Durumu:</span> <span className={`font-medium ${telemetryData.payload_gps_valid ? theme.greenText : theme.redText}`}>{telemetryData.payload_gps_valid ? 'Geçerli' : 'Geçersiz'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Telemetri verileri*/}
            {activeTab === 'telemetri' && (
              <div className="space-y-6">
                
                {/* Telemetri Grid */}
                <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                  <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Telemetri Verileri</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className={`p-4 rounded-lg border ${theme.blueCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>İrtifa</p>
                      <p className={`text-2xl font-bold ${theme.blueText}`}>{telemetryData.altitude.toFixed(1)}m</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.greenCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Max İrtifa</p>
                      <p className={`text-2xl font-bold ${theme.greenText}`}>{telemetryData.max_altitude.toFixed(1)}m</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.greenCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Roket GPS İrtifa</p>
                      <p className={`text-2xl font-bold ${theme.greenText}`}>{telemetryData.gps_altitude.toFixed(1)}m</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.purpleCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Delta Y</p>
                      <p className={`text-2xl font-bold ${theme.purpleText}`}>{telemetryData.delta_y.toFixed(1)}</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${telemetryData.p1 ? theme.redCard : theme.grayCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Birincil Paraşüt (P1)</p>
                      <p className={`text-2xl font-bold ${telemetryData.p1 ? theme.redText : theme.textMuted}`}>{telemetryData.p1 ? 'AÇIK' : 'KAPALI'}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${telemetryData.p2 ? theme.orangeCard : theme.grayCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>İkincil Paraşüt (P2)</p>
                      <p className={`text-2xl font-bold ${telemetryData.p2 ? theme.orangeText : theme.textMuted}`}>{telemetryData.p2 ? 'AÇIK' : 'KAPALI'}</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${theme.yellowCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Jiroskop X</p>
                      <p className={`text-2xl font-bold ${theme.yellowText}`}>{telemetryData.gyro_x.toFixed(1)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.yellowCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Jiroskop Y</p>
                      <p className={`text-2xl font-bold ${theme.yellowText}`}>{telemetryData.gyro_y.toFixed(1)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.yellowCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Jiroskop Z</p>
                      <p className={`text-2xl font-bold ${theme.yellowText}`}>{telemetryData.gyro_z.toFixed(1)}</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${theme.orangeCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>İvme X</p>
                      <p className={`text-2xl font-bold ${theme.orangeText}`}>{telemetryData.accel_x.toFixed(2)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.orangeCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>İvme Y</p>
                      <p className={`text-2xl font-bold ${theme.orangeText}`}>{telemetryData.accel_y.toFixed(2)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.orangeCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>İvme Z</p>
                      <p className={`text-2xl font-bold ${theme.orangeText}`}>{telemetryData.accel_z.toFixed(2)}</p>
                    </div>

                    <div className={`p-4 rounded-lg border ${theme.purpleCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Açı</p>
                      <p className={`text-2xl font-bold ${theme.purpleText}`}>{telemetryData.pitch.toFixed(1)}°</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${telemetryData.gps_valid ? theme.greenCard : theme.redCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Roket GPS</p>
                      <p className={`text-lg font-bold ${telemetryData.gps_valid ? theme.greenText : theme.redText}`}>{telemetryData.gps_valid ? 'VALID' : 'INVALID'}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.blueCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Roket Enlem</p>
                      <p className={`text-lg font-bold ${theme.blueText}`}>{telemetryData.gps_valid ? telemetryData.gps_latitude.toFixed(6) : 'N/A'}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.blueCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Roket Boylam</p>
                      <p className={`text-lg font-bold ${theme.blueText}`}>{telemetryData.gps_valid ? telemetryData.gps_longitude.toFixed(6) : 'N/A'}</p>
                    </div>

                    <div className={`p-4 rounded-lg border ${telemetryData.payload_gps_valid ? theme.greenCard : theme.redCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload GPS</p>
                      <p className={`text-lg font-bold ${telemetryData.payload_gps_valid ? theme.greenText : theme.redText}`}>{telemetryData.payload_gps_valid ? 'VALID' : 'INVALID'}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload GPS İrtifa</p>
                      <p className={`text-lg font-bold ${theme.cyanText}`}>
                        {(telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0) 
                          ? telemetryData.payload_gps_altitude.toFixed(1) + 'm' : 'N/A'}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Enlem</p>
                      <p className={`text-lg font-bold ${theme.cyanText}`}>
                        {(telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0)
                          ? telemetryData.payload_latitude.toFixed(6) : 'N/A'}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Boylam</p>
                      <p className={`text-lg font-bold ${theme.cyanText}`}>
                        {(telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0)
                          ? telemetryData.payload_longitude.toFixed(6) : 'N/A'}
                      </p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${theme.grayCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Roket Paket Sayısı</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{telemetryData.packet_count}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.grayCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Paket Sayısı</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{telemetryData.payload_packet_count || 0}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.grayCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Roket Son Güncelleme</p>
                      <p className={`text-lg font-bold ${theme.text}`}>{telemetryData.last_update || 'N/A'}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.grayCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Son Güncelleme</p>
                      <p className={`text-lg font-bold ${theme.text}`}>{telemetryData.payload_last_update || 'N/A'}</p>
                    </div>

                    <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Gyro X</p>
                      <p className={`text-2xl font-bold ${theme.cyanText}`}>{telemetryData.payload_gyro_x.toFixed(1)}°</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Gyro Y</p>
                      <p className={`text-2xl font-bold ${theme.cyanText}`}>{telemetryData.payload_gyro_y.toFixed(1)}°</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                      <p className={`text-sm ${theme.textMuted}`}>Payload Gyro Z</p>
                      <p className={`text-2xl font-bold ${theme.cyanText}`}>{telemetryData.payload_gyro_z.toFixed(1)}°</p>
                    </div>
                  </div>
                </div>

                {/* Paraşüt Durum Özeti */}
                <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                  <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Paraşüt Durum Özeti</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg text-center border ${theme.blueCard}`}>
                      <h3 className={`text-sm font-medium mb-2 ${theme.blueText}`}>HYİ Durum Değeri</h3>
                      <div className={`text-3xl font-bold ${theme.blueText}`}>
                        {telemetryData.p1 && telemetryData.p2 ? '4' : 
                         telemetryData.p1 && !telemetryData.p2 ? '2' : 
                         !telemetryData.p1 && telemetryData.p2 ? '3' : '1'}
                      </div>
                      <p className={`text-xs mt-1 ${theme.blueText}`}>
                        {telemetryData.p1 && telemetryData.p2 ? 'Her ikisi de açık' : 
                         telemetryData.p1 && !telemetryData.p2 ? 'Sadece P1 açık' : 
                         !telemetryData.p1 && telemetryData.p2 ? 'Sadece P2 açık' : 'Her ikisi de kapalı'}
                      </p>
                    </div>
                    
                    <div className={`p-4 rounded-lg text-center border ${telemetryData.p1 ? theme.redCard : theme.grayCard}`}>
                      <h3 className={`text-sm font-medium mb-2 ${theme.text}`}>Birincil Paraşüt (P1)</h3>
                      <div className={`text-3xl font-bold ${telemetryData.p1 ? theme.redText : theme.textMuted}`}>
                        {telemetryData.p1 ? 'AÇIK' : 'KAPALI'}
                      </div>
                      <p className={`text-xs mt-1 ${theme.textMuted}`}>Bit değeri: {telemetryData.p1 ? '1' : '0'}</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg text-center border ${telemetryData.p2 ? theme.orangeCard : theme.grayCard}`}>
                      <h3 className={`text-sm font-medium mb-2 ${theme.text}`}>İkincil Paraşüt (P2)</h3>
                      <div className={`text-3xl font-bold ${telemetryData.p2 ? theme.orangeText : theme.textMuted}`}>
                        {telemetryData.p2 ? 'AÇIK' : 'KAPALI'}
                      </div>
                      <p className={`text-xs mt-1 ${theme.textMuted}`}>Bit değeri: {telemetryData.p2 ? '1' : '0'}</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg text-center border ${theme.purpleCard}`}>
                      <h3 className={`text-sm font-medium mb-2 ${theme.purpleText}`}>Durum Tablosu</h3>
                      <div className={`text-xs space-y-1 ${theme.purpleText}`}>
                        <div>1: Her ikisi kapalı</div>
                        <div>2: Sadece P1 açık</div>
                        <div>3: Sadece P2 açık</div>
                        <div>4: Her ikisi açık</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sıvı Seviye Veri Tablosu */}
                {telemetryData.liquid_levels && telemetryData.liquid_levels.length > 0 && (
                  <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                    <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Sıvı Seviye Verileri</h2>
                    
                    <div className="grid grid-cols-8 gap-4">
                      {telemetryData.liquid_levels.map((level, index) => (
                        <div key={index} className={`text-center p-3 rounded-lg border ${theme.grayCard}`}>
                          <div className={`text-sm font-medium mb-2 ${theme.textMuted}`}>Sensör {index + 1}</div>
                          <div className={`text-2xl font-bold mb-2 ${theme.blueText}`}>{level}</div>
                          <div className="w-full bg-gray-600/30 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-300 ${level < 50 ? 'bg-green-500' : level < 150 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                              style={{ width: `${(level / 255) * 100}%` }} 
                            />
                          </div>
                          <div className={`text-xs mt-1 ${theme.textMuted}`}>{((level / 255) * 100).toFixed(1)}%</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className={`mt-4 p-3 rounded-lg border ${theme.blueCard}`}>
                      <div className={`text-sm ${theme.blueText}`}>
                        <strong>Toplam Sensör:</strong> {telemetryData.liquid_levels.length} | 
                        <strong> Ortalama Seviye:</strong> {(telemetryData.liquid_levels.reduce((a, b) => a + b, 0) / telemetryData.liquid_levels.length).toFixed(1)} | 
                        <strong> Maksimum Seviye:</strong> {Math.max(...telemetryData.liquid_levels)} | 
                        <strong> Minimum Seviye:</strong> {Math.min(...telemetryData.liquid_levels)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3D Modeller */}
            {activeTab === 'modeller' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Roket 3D */}
                  <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                    <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Roket 3D Modeli</h2>
                    <div className={`mb-4 p-3 rounded-lg border ${theme.blueCard}`}>
                      <h3 className={`text-sm font-medium mb-2 ${theme.blueText}`}>Kalibrasyon Bilgileri</h3>
                      <div className={`text-xs ${theme.blueText} opacity-80`}>
                        <p><strong>Referans Değerler (Yüzeye Dik):</strong></p>
                        <p>Gyro X: 83.7° | Gyro Y: 3.4° | Gyro Z: 111.1°</p>
                        <p className="mt-1">Bu değerler modelin yüzeye dik durumunu temsil eder</p>
                      </div>
                    </div>
                    <Rocket3D gyroX={telemetryData.gyro_x} gyroY={telemetryData.gyro_y} gyroZ={telemetryData.gyro_z} altitude={telemetryData.altitude} isConnected={isConnected} isDarkMode={isDarkMode} />
                  </div>

                  {/* Payload 3D */}
                  <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                    <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Payload 3D Modeli</h2>
                    <div className={`mb-4 p-3 rounded-lg border ${theme.cyanCard}`}>
                      <h3 className={`text-sm font-medium mb-2 ${theme.cyanText}`}>Kalibrasyon Bilgileri</h3>
                      <div className={`text-xs ${theme.cyanText} opacity-80`}>
                        <p><strong>Referans Değerler (Yüzeye Dik):</strong></p>
                        <p>Roll: 92.2° | Pitch: 0.3° | Yaw: -74.0°</p>
                        <p className="mt-1">Bu değerler modelin yüzeye dik durumunu temsil eder</p>
                      </div>
                    </div>
                    <Payload3D gyroX={telemetryData.payload_gyro_x} gyroY={telemetryData.payload_gyro_y} gyroZ={telemetryData.payload_gyro_z} altitude={telemetryData.payload_gps_altitude} isConnected={isConnected && connectionStatus.payload_gps} isDarkMode={isDarkMode} />
                  </div>
                </div>

                {/* Sıvı Seviye 3D */}
                <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                  <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Sıvı Seviye Sensörleri (3D)</h2>
                  <LiquidLevel3D liquidData={telemetryData.all_liquid_data} isDarkMode={isDarkMode} />
                </div>
              </div>
            )}

            {/* GPS */}
            {activeTab === 'harita' && (
              <div className="space-y-6">
                
                {/* GPS Data Comparison */}
                {telemetryData.gps_valid && (telemetryData.payload_latitude !== 0 || telemetryData.payload_longitude !== 0 || telemetryData.payload_gps_altitude !== 0) && (
                  <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                    <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>GPS Veri Karşılaştırması</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      <div className={`p-4 rounded-lg border ${theme.blueCard}`}>
                        <h3 className={`text-sm font-medium mb-2 ${theme.blueText}`}>Roket GPS</h3>
                        <div className={`space-y-1 text-sm ${theme.text}`}>
                          <p><span className={theme.textMuted}>İrtifa:</span> <span className="font-medium">{telemetryData.gps_altitude.toFixed(1)}m</span></p>
                          <p><span className={theme.textMuted}>Enlem:</span> <span className="font-medium">{telemetryData.gps_latitude.toFixed(6)}°</span></p>
                          <p><span className={theme.textMuted}>Boylam:</span> <span className="font-medium">{telemetryData.gps_longitude.toFixed(6)}°</span></p>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border ${theme.cyanCard}`}>
                        <h3 className={`text-sm font-medium mb-2 ${theme.cyanText}`}>Payload GPS</h3>
                        <div className={`space-y-1 text-sm ${theme.text}`}>
                          <p><span className={theme.textMuted}>İrtifa:</span> <span className="font-medium">{telemetryData.payload_gps_altitude.toFixed(1)}m</span></p>
                          <p><span className={theme.textMuted}>Enlem:</span> <span className="font-medium">{telemetryData.payload_latitude.toFixed(6)}°</span></p>
                          <p><span className={theme.textMuted}>Boylam:</span> <span className="font-medium">{telemetryData.payload_longitude.toFixed(6)}°</span></p>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border ${theme.purpleCard}`}>
                        <h3 className={`text-sm font-medium mb-2 ${theme.purpleText}`}>Farklar (Sapma)</h3>
                        <div className={`space-y-1 text-sm ${theme.text}`}>
                          <p><span className={theme.textMuted}>İrtifa Farkı:</span> <span className="font-medium">{Math.abs(telemetryData.gps_altitude - telemetryData.payload_gps_altitude).toFixed(1)}m</span></p>
                          <p><span className={theme.textMuted}>Enlem Farkı:</span> <span className="font-medium">{Math.abs(telemetryData.gps_latitude - telemetryData.payload_latitude).toFixed(6)}°</span></p>
                          <p><span className={theme.textMuted}>Boylam Farkı:</span> <span className="font-medium">{Math.abs(telemetryData.gps_longitude - telemetryData.payload_longitude).toFixed(6)}°</span></p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Google Maps */}
                <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                  <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>GPS Konum Haritası</h2>
                  <GoogleMap
                    rocketLat={telemetryData.gps_latitude} rocketLon={telemetryData.gps_longitude} rocketValid={telemetryData.gps_valid}
                    payloadLat={telemetryData.payload_latitude} payloadLon={telemetryData.payload_longitude} payloadValid={telemetryData.payload_gps_valid}
                    rocketAltitude={telemetryData.gps_altitude} payloadAltitude={telemetryData.payload_gps_altitude}
                  />
                </div>
              </div>
            )}

            {/* Sistem Logları */}
            {activeTab === 'loglar' && (
              <div className={`rounded-lg p-6 border transition-colors ${theme.card}`}>
                <h2 className={`text-lg font-semibold mb-4 pb-2 border-b ${theme.border} ${theme.text}`}>Sistem Logları</h2>
                <div className="bg-[#0d1117] text-green-400 p-4 rounded-lg h-[600px] overflow-y-auto font-mono text-sm border border-gray-800 shadow-inner">
                  {logs.length === 0 ? (
                    <p className="text-gray-500">Henüz log mesajı yok...</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={log.id || index} className="mb-1">
                        <span className="text-gray-500">[{log.timestamp || new Date().toLocaleTimeString()}]</span>{' '}
                        <span className="text-gray-200">{typeof log === 'string' ? log : log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;