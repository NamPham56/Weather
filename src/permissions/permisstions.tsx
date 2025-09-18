import { PermissionsAndroid, Platform } from "react-native";

async function requestlocationPermission() {
    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Cấp quyền vị trí",
                message: "Ứng dụng cần quyền truy cập vị trí của bạn",
                buttonPositive: "Đồng ý",
                buttonNegative: "Từ chối"
            }
        )
        return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    return true;
}
export { requestlocationPermission }