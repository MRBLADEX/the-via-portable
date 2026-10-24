import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components';
import {AccentButton} from './accent-button';
import {ModalBackground} from './dialog-base';

type HidDeviceRequest = {
  requestId: string;
  devices: DesktopHidDevice[];
};

const PickerBackground = styled(ModalBackground)`
  z-index: 10000;
`;

const PickerPanel = styled.div`
  width: min(580px, calc(100vw - 40px));
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  box-sizing: border-box;
  border: 2px solid var(--color_accent);
  border-radius: 8px;
  background: var(--bg_menu);
  color: var(--color_label);
`;

const Title = styled.h2`
  margin: 0;
  color: var(--color_label);
  font-size: 22px;
  text-align: center;
`;

const Description = styled.p`
  margin: 0;
  color: var(--color_label);
  font-size: 15px;
  line-height: 1.5;
  text-align: center;
`;

const DeviceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
`;

const DeviceOption = styled.button`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 13px 15px;
  border: 1px solid var(--color_accent);
  border-radius: 5px;
  background: var(--bg_outside-accent);
  color: var(--color_label);
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    filter: brightness(1.15);
    outline: 2px solid var(--color_accent);
    outline-offset: 1px;
  }
`;

const DeviceName = styled.span`
  font-size: 16px;
  font-weight: 600;
`;

const DeviceIds = styled.span`
  color: var(--color_label);
  font-size: 13px;
  opacity: 0.8;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
`;

const formatDeviceId = (id: number) =>
  `0x${id.toString(16).padStart(4, '0').toUpperCase()}`;

export const ElectronHidDevicePicker = () => {
  const {t} = useTranslation();
  const [request, setRequest] = useState<HidDeviceRequest | null>(null);

  useEffect(() => {
    return window.viaDesktop?.onHidDeviceRequest(setRequest);
  }, []);

  useEffect(() => {
    if (!request) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.viaDesktop?.selectHidDevice(request.requestId, null);
        setRequest(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request]);

  if (!request) return null;

  const cancel = () => {
    window.viaDesktop?.selectHidDevice(request.requestId, null);
    setRequest(null);
  };

  return (
    <PickerBackground
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <PickerPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="hid-picker-title"
      >
        <Title id="hid-picker-title">{t('Select a device')}</Title>
        <Description>
          {t('Choose the keyboard or HID device to connect to VIA.')}
        </Description>
        <DeviceList>
          {request.devices.map((device) => (
            <DeviceOption
              key={device.deviceId}
              onClick={() => {
                window.viaDesktop?.selectHidDevice(
                  request.requestId,
                  device.deviceId,
                );
                setRequest(null);
              }}
            >
              <DeviceName>{device.name || t('Unknown HID device')}</DeviceName>
              <DeviceIds>
                {t('VID {{vid}} · PID {{pid}}', {
                  vid: formatDeviceId(device.vendorId),
                  pid: formatDeviceId(device.productId),
                })}
              </DeviceIds>
            </DeviceOption>
          ))}
        </DeviceList>
        <Footer>
          <AccentButton onClick={cancel}>{t('Cancel')}</AccentButton>
        </Footer>
      </PickerPanel>
    </PickerBackground>
  );
};
