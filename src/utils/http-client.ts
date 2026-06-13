import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 200;

type RetryableAxiosRequestConfig = AxiosRequestConfig & { retryCount? : number };

const httpClient = axios.create({
    timeout : REQUEST_TIMEOUT_MS
});

httpClient.interceptors.response.use(
    //success
    (response : AxiosResponse) => response,

    //failure -> retry;
    async (error : AxiosError) => {
        //access original request config 
        const config = error.config as RetryableAxiosRequestConfig | undefined;

        //if no config or retries exhausted, reject 
        if(!config){
            return Promise.reject(error);
        }

        if(config.retryCount === undefined) { 
            config.retryCount = 0;
        }

        //retry conditions 
        //1. no response from BE
        //2. timeout
        //3. explicit network error message 
        //4. 5xx status codes from BE
    
        const shouldRetry = 
            !error.response || 
            error.code === "ECONNABORTED" ||
            error.message.includes("Network Error") ||
            (error.response.status >= 500 && error.response.status < 600);

        if(shouldRetry && config.retryCount < MAX_RETRIES) {
            config.retryCount++;

            //exp backoff delays : 200 , 400 , 800 ms
            const delay = BASE_RETRY_DELAY_MS * Math.pow(2 , config.retryCount - 1);
            // wait before retrying to reduce retry storms
            await new Promise((resolve) => setTimeout(resolve , delay));

            return httpClient.request(config);
        }

        //if not retrying, reject with original error
        return Promise.reject(error);
    }
);

export const HttpClient = httpClient;