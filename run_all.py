import subprocess
import os
import time
import sys

def run_in_new_console(command, cwd, title):
    """Chạy lệnh trong một cửa sổ Command Prompt mới (chỉ dành cho Windows)"""
    if sys.platform == 'win32':
        # Mở cmd mới, đặt tiêu đề và chạy lệnh
        cmd = f'start "{title}" cmd /k "cd /d {cwd} && {command}"'
        subprocess.Popen(cmd, shell=True)
    else:
        print("Script này được tối ưu cho Windows.")
        # Dành cho Mac/Linux (Terminal hoặc x-terminal-emulator)
        # Tùy hệ điều hành mà lệnh sẽ khác nhau.

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    blockchain_dir = os.path.join(base_dir, "blockchain")
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    print("🚀 Đang khởi động toàn bộ hệ thống Blockchain Certificate...")

    # 1. Chạy Hardhat Node (Blockchain)
    if os.path.exists(blockchain_dir):
        print("-> Khởi động Blockchain Node...")
        run_in_new_console("npm run node", blockchain_dir, "Blockchain Node (Hardhat)")
    else:
        print(f"❌ Không tìm thấy thư mục {blockchain_dir}")

    # Đợi vài giây để node khởi động hẳn (tránh backend bị lỗi connect)
    time.sleep(3)

    # 2. Chạy Backend
    if os.path.exists(backend_dir):
        print("-> Khởi động Backend Server...")
        run_in_new_console("npm run dev", backend_dir, "Backend Server (Express)")
    else:
        print(f"❌ Không tìm thấy thư mục {backend_dir}")

    # 3. Chạy Frontend
    if os.path.exists(frontend_dir):
        print("-> Khởi động Frontend...")
        run_in_new_console("npm run dev", frontend_dir, "Frontend (Vite)")
    else:
        print(f"❌ Không tìm thấy thư mục {frontend_dir}")

    print("✅ Đã khởi động xong tất cả các tiến trình trong các cửa sổ mới!")
    print("Bạn có thể tắt từng cửa sổ CMD để dừng các tiến trình tương ứng.")
