import axios from 'axios';

const API_BASE_URL = '/api'; // Adjust if needed

export const simulateCNDP = async (payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/cndp/simulate`, payload);
        return response.data;
    } catch (error) {
        console.error("API Call Error:", error);
        throw error;
    }
};

export const simulateBandoeng = async (payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/bandoeng/simulate`, payload);
        return response.data;
    } catch (error) {
        console.error("API Call Error (Bandoeng):", error);
        throw error;
    }
}

export const downloadBandoengTemplate = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/export/bandoeng/template`, {
            responseType: 'blob', // Important for file download
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Modele_Import_Volumes_Bandoeng.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();

    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importBandoengVolumes = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/bandoeng/import/volume-grid`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};

export const downloadBandoengTasksTemplate = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/export/bandoeng/tasks-template`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Modele_Import_Taches_Bandoeng.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();

    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

export const importBandoengTasks = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(`${API_BASE_URL}/bandoeng/import/tasks`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Import Error:", error);
        throw error;
    }
};
