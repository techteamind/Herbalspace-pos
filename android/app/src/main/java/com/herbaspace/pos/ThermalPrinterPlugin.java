package com.herbaspace.pos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

/**
 * Cetak thermal langsung IN-APP via Bluetooth Classic (SPP) — untuk printer 58mm
 * seperti Ecoprint POS58B / RPP02. Plugin native khusus Capacitor 8 (bukan
 * bluetooth-serial yg crash). Hanya perangkat yg SUDAH dipasangkan (bonded).
 */
@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(alias = "bt", strings = { Manifest.permission.BLUETOOTH_CONNECT })
    }
)
public class ThermalPrinterPlugin extends Plugin {
    // UUID standar Serial Port Profile
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private boolean needsRuntimePerm() {
        return Build.VERSION.SDK_INT >= 31; // BLUETOOTH_CONNECT baru wajib runtime di API 31+
    }

    @PluginMethod
    public void list(PluginCall call) {
        if (needsRuntimePerm() && getPermissionState("bt") != PermissionState.GRANTED) {
            requestPermissionForAlias("bt", call, "listPermCallback");
            return;
        }
        doList(call);
    }

    @PermissionCallback
    private void listPermCallback(PluginCall call) {
        if (getPermissionState("bt") == PermissionState.GRANTED) doList(call);
        else call.reject("Izin Bluetooth ditolak");
    }

    private void doList(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) { call.reject("Perangkat tak punya Bluetooth"); return; }
            if (!adapter.isEnabled()) { call.reject("Bluetooth belum aktif"); return; }
            JSArray devices = new JSArray();
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            for (BluetoothDevice d : bonded) {
                JSObject o = new JSObject();
                o.put("name", d.getName() != null ? d.getName() : d.getAddress());
                o.put("address", d.getAddress());
                devices.put(o);
            }
            JSObject ret = new JSObject();
            ret.put("devices", devices);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Izin Bluetooth kurang");
        } catch (Exception e) {
            call.reject(e.getMessage() != null ? e.getMessage() : "Gagal ambil daftar printer");
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (needsRuntimePerm() && getPermissionState("bt") != PermissionState.GRANTED) {
            requestPermissionForAlias("bt", call, "printPermCallback");
            return;
        }
        doPrint(call);
    }

    @PermissionCallback
    private void printPermCallback(PluginCall call) {
        if (getPermissionState("bt") == PermissionState.GRANTED) doPrint(call);
        else call.reject("Izin Bluetooth ditolak");
    }

    private void doPrint(PluginCall call) {
        final String address = call.getString("address");
        final String dataB64 = call.getString("data");
        if (address == null || dataB64 == null) { call.reject("address & data wajib"); return; }
        // Koneksi/tulis di thread terpisah (jangan blok UI thread).
        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) { call.reject("Bluetooth belum aktif"); return; }
                BluetoothDevice device = adapter.getRemoteDevice(address);
                socket = device.createRfcommSocketToServiceRecord(SPP);
                // JANGAN panggil adapter.cancelDiscovery() — di Android 12+ butuh izin
                // BLUETOOTH_SCAN (tak kita minta) → SecurityException → cetak gagal total.
                socket.connect();
                OutputStream out = socket.getOutputStream();
                byte[] bytes = Base64.decode(dataB64, Base64.DEFAULT);
                out.write(bytes);
                out.flush();
                try { Thread.sleep(400); } catch (InterruptedException ignored) {} // beri jeda buffer printer
                out.close();
                call.resolve();
            } catch (SecurityException e) {
                call.reject("Izin Bluetooth kurang");
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Gagal terhubung ke printer");
            } finally {
                if (socket != null) { try { socket.close(); } catch (Exception ignored) {} }
            }
        }).start();
    }
}
